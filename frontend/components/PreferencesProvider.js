'use client';
import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { DEFAULT_PREFERENCES, CURRENCIES, formatMoney, convertFromINR } from '@/lib/preferences';
import { applyTheme } from '@/lib/themes';

const PrefsContext = createContext(null);
const LS_KEY = 'suvio.preferences';

export function PreferencesProvider({ children }) {
  const [prefs, setPrefs] = useState(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);
  const saveTimer = useRef(null);

  // 1) Hydrate from localStorage instantly to avoid FOUC
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const cached = { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
        setPrefs(cached);
        applyTheme(cached.theme, cached.accentColor);
      } else {
        applyTheme(DEFAULT_PREFERENCES.theme, DEFAULT_PREFERENCES.accentColor);
      }
    } catch {
      applyTheme(DEFAULT_PREFERENCES.theme, DEFAULT_PREFERENCES.accentColor);
    }
    setReady(true);
  }, []);

  // 2) Merge from server (authoritative) after mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/preferences');
        if (!r.ok) return;
        const { preferences } = await r.json();
        if (cancelled || !preferences) return;
        const merged = { ...DEFAULT_PREFERENCES, ...preferences };
        setPrefs(merged);
        try { localStorage.setItem(LS_KEY, JSON.stringify(merged)); } catch {}
        applyTheme(merged.theme, merged.accentColor);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // 3) Re-apply theme + persist on any change
  useEffect(() => {
    if (!ready) return;
    applyTheme(prefs.theme, prefs.accentColor);
    try { localStorage.setItem(LS_KEY, JSON.stringify(prefs)); } catch {}
    // Debounced sync to backend
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      }).catch(() => {});
    }, 400);
  }, [prefs, ready]);

  // Cross-tab sync
  useEffect(() => {
    function onStorage(e) {
      if (e.key === LS_KEY && e.newValue) {
        try {
          const next = JSON.parse(e.newValue);
          setPrefs(next);
          applyTheme(next.theme, next.accentColor);
        } catch {}
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setPreference = useCallback((key, value) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
  }, []);

  const setPreferences = useCallback((updates) => {
    setPrefs(prev => ({ ...prev, ...updates }));
  }, []);

  const format = useCallback((amount, opts) => {
    // Amounts stored internally in INR (base). Convert then format.
    const converted = convertFromINR(amount, prefs.currency);
    return formatMoney(converted, prefs.currency, opts);
  }, [prefs.currency]);

  const value = useMemo(() => ({
    prefs,
    ready,
    setPreference,
    setPreferences,
    format,
    currency: prefs.currency,
    currencyMeta: CURRENCIES[prefs.currency] || CURRENCIES.INR,
    theme: prefs.theme,
    accentColor: prefs.accentColor,
  }), [prefs, ready, setPreference, setPreferences, format]);

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PrefsContext);
  if (!ctx) {
    // Safe fallback if a component is outside provider
    return {
      prefs: DEFAULT_PREFERENCES,
      ready: false,
      setPreference: () => {},
      setPreferences: () => {},
      format: (a) => formatMoney(a, DEFAULT_PREFERENCES.currency),
      currency: DEFAULT_PREFERENCES.currency,
      currencyMeta: CURRENCIES[DEFAULT_PREFERENCES.currency],
      theme: DEFAULT_PREFERENCES.theme,
      accentColor: DEFAULT_PREFERENCES.accentColor,
    };
  }
  return ctx;
}

export function useCurrencyFormat() {
  const { format, currency, currencyMeta } = usePreferences();
  return { format, currency, currencyMeta };
}
