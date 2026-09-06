'use client';
import { useEffect, useState, useCallback } from 'react';

// Central hook for PWA install state. Powers both the floating install pill
// and the buttons scattered across the marketing pages. On Android/desktop
// Chrome/Edge this fires `beforeinstallprompt` and Chrome auto-generates a
// WebAPK on install → the icon on the home screen launches Suvio in
// standalone mode, exactly like the ChatGPT app.
export function useInstallPrompt() {
  const [event, setEvent] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState('other');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setInstalled(isStandalone);

    const ua = window.navigator.userAgent || '';
    if (/android/i.test(ua)) setPlatform('android');
    else if (/iphone|ipad|ipod/i.test(ua)) setPlatform('ios');
    else if (/mac/i.test(ua)) setPlatform('mac');
    else if (/windows/i.test(ua)) setPlatform('windows');
    else setPlatform('other');

    const onPrompt = (e) => {
      e.preventDefault();
      setEvent(e);
    };
    const onInstalled = () => {
      setEvent(null);
      setInstalled(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!event) return { ok: false, reason: 'no_prompt' };
    event.prompt();
    const r = await event.userChoice;
    setEvent(null);
    return { ok: r.outcome === 'accepted', outcome: r.outcome };
  }, [event]);

  return {
    installed,
    canPrompt: !!event,
    promptInstall,
    platform,
  };
}
