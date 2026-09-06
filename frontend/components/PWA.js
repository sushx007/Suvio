'use client';
import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useInstallPrompt } from '@/lib/usePWAInstall';

// Floating install pill. Uses the shared install hook so it stays in
// sync with the Install buttons in the marketing header/hero and the
// /download page.
export default function PWA() {
  const { installed, canPrompt, promptInstall } = useInstallPrompt();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Register the service worker.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          try { reg.update(); } catch {}
          let refreshed = false;
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshed) return;
            refreshed = true;
            window.location.reload();
          });
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!canPrompt || installed) { setVisible(false); return; }
    try {
      const dismissed = Number(localStorage.getItem('suvio.pwa.dismissed') || 0);
      if (Date.now() - dismissed > 1000 * 60 * 60 * 24 * 7) setVisible(true);
    } catch { setVisible(true); }
  }, [canPrompt, installed]);

  async function install() {
    const r = await promptInstall();
    if (!r.ok) {
      try { localStorage.setItem('suvio.pwa.dismissed', String(Date.now())); } catch {}
    }
    setVisible(false);
  }
  function dismiss() {
    try { localStorage.setItem('suvio.pwa.dismissed', String(Date.now())); } catch {}
    setVisible(false);
  }
  if (!visible) return null;
  return (
    <div
      className="fixed bottom-4 inset-x-4 md:inset-x-auto md:right-6 md:w-96 z-50 glass-strong rounded-2xl p-4 flex items-center gap-3 border border-sky-500/20"
      data-testid="pwa-install-prompt"
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-purple-500 grid place-items-center shrink-0">
        <Download className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">Install Suvio</div>
        <div className="text-xs text-white/60">Get the app on your home screen for faster access.</div>
      </div>
      <button
        onClick={install}
        className="text-xs bg-white text-black rounded-lg px-3 py-1.5 font-semibold hover:bg-white/90 transition"
        data-testid="pwa-install-btn"
      >
        Install
      </button>
      <button onClick={dismiss} className="text-white/40 hover:text-white transition" data-testid="pwa-dismiss">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
