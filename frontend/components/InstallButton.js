'use client';
import Link from 'next/link';
import { Download, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useInstallPrompt } from '@/lib/usePWAInstall';
import { toast } from 'sonner';

/**
 * Universal "Install App" button.
 *
 * Behaviour:
 *  - If already installed (standalone) → renders "Open App" that jumps to /dashboard.
 *  - If Chrome/Edge has queued a `beforeinstallprompt` event → clicking triggers
 *    the native install dialog (auto-creates a WebAPK on Android — same tech
 *    ChatGPT uses).
 *  - iOS Safari → jumps to /download for the "Add to Home Screen" instructions.
 *  - Anything else → jumps to /download for cross-platform install guidance.
 */
export default function InstallButton({ variant = 'primary', className = '', label }) {
  const { installed, canPrompt, promptInstall, platform } = useInstallPrompt();

  async function onClick() {
    if (installed) {
      window.location.href = '/dashboard';
      return;
    }
    if (canPrompt) {
      const r = await promptInstall();
      if (r.ok) toast.success('Suvio is installing…');
      return;
    }
    if (platform === 'ios') {
      toast('Tap the share button in Safari, then "Add to Home Screen"', { duration: 6000 });
    }
    window.location.href = '/download';
  }

  const base = 'inline-flex items-center gap-2 rounded-lg text-sm font-semibold transition';
  const styles =
    variant === 'ghost'
      ? 'px-4 py-2 border border-white/15 hover:bg-white/5 text-white'
      : 'px-4 py-2 accent-bg hover:opacity-90';

  const Icon = installed ? CheckCircle2 : Download;
  const text = label || (installed ? 'Open App' : 'Install App');

  return (
    <button onClick={onClick} className={`${base} ${styles} ${className}`} data-testid="install-app-btn">
      <Icon className="w-4 h-4" /> {text}
    </button>
  );
}

/** Small text-only variant for menus/footers. */
export function InstallLink({ className = '' }) {
  const { installed } = useInstallPrompt();
  return (
    <Link
      href={installed ? '/dashboard' : '/download'}
      className={`text-sm text-white/70 hover:text-white transition inline-flex items-center gap-1 ${className}`}
      data-testid="install-link"
    >
      <ExternalLink className="w-3.5 h-3.5" /> {installed ? 'Open Suvio' : 'Get the app'}
    </Link>
  );
}
