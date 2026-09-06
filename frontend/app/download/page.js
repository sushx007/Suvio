'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Sparkles, Smartphone, Apple, Monitor, Chrome, ArrowLeft, Share, Plus, Download } from 'lucide-react';
import InstallButton from '@/components/InstallButton';
import { useInstallPrompt } from '@/lib/usePWAInstall';

// Standalone install guide — every platform. Linked from the "Install"
// buttons across the app when a direct browser prompt isn't available
// (typically iOS Safari, or desktop Firefox).
export default function DownloadPage() {
  const { installed, canPrompt, platform } = useInstallPrompt();
  const [origin, setOrigin] = useState('');
  useEffect(() => { if (typeof window !== 'undefined') setOrigin(window.location.origin); }, []);

  return (
    <div className="min-h-screen grid-bg text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white transition mb-8" data-testid="download-back">
          <ArrowLeft className="w-4 h-4" /> Back to Suvio
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-400 to-purple-500 grid place-items-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-4xl font-semibold">Install Suvio</h1>
        </div>
        <p className="text-white/60 max-w-2xl">
          Suvio installs as a Progressive Web App — no App Store, no permissions dance. You get a real home-screen
          icon, full-screen experience, offline shell, and push notifications. It works exactly like the ChatGPT app.
        </p>

        {installed && (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 grid place-items-center"><Download className="w-4 h-4 text-emerald-300"/></div>
            <div className="flex-1">
              <div className="font-semibold">Suvio is already installed on this device.</div>
              <div className="text-sm text-white/60">Launch it from your home screen or click below.</div>
            </div>
            <Link href="/dashboard" className="text-sm accent-bg rounded-lg px-4 py-2 font-semibold" data-testid="open-installed-app">Open App</Link>
          </div>
        )}

        {canPrompt && !installed && (
          <div className="mt-6 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/20 grid place-items-center"><Download className="w-4 h-4 text-sky-300"/></div>
            <div className="flex-1">
              <div className="font-semibold">Your browser can install Suvio right now.</div>
              <div className="text-sm text-white/60">One click. No download, no waiting.</div>
            </div>
            <InstallButton label="Install now" />
          </div>
        )}

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card icon={<Chrome className="w-5 h-5 text-sky-400" />} title="Android — Chrome / Edge" highlight={platform === 'android'}>
            <ol className="text-sm text-white/70 space-y-2 list-decimal ml-4">
              <li>Open <span className="text-white">{origin || 'suvio.app'}</span> in Chrome or Edge.</li>
              <li>Tap the <b>Install App</b> button at the top, or open the browser menu (⋮) → <b>Install app</b>.</li>
              <li>Confirm. Chrome auto-generates a signed WebAPK and adds Suvio to your home screen.</li>
              <li>Launch Suvio from your app drawer — it opens full-screen with its own icon, just like a native app.</li>
            </ol>
            <div className="mt-4"><InstallButton /></div>
          </Card>

          <Card icon={<Apple className="w-5 h-5 text-white" />} title="iPhone / iPad — Safari" highlight={platform === 'ios'}>
            <ol className="text-sm text-white/70 space-y-2 list-decimal ml-4">
              <li>Open <span className="text-white">{origin || 'suvio.app'}</span> in <b>Safari</b> (not Chrome — iOS restriction).</li>
              <li>Tap the <b><Share className="w-3.5 h-3.5 inline"/> Share</b> button in the tab bar.</li>
              <li>Scroll and tap <b><Plus className="w-3.5 h-3.5 inline"/> Add to Home Screen</b>.</li>
              <li>Confirm. Suvio's icon appears on your home screen and launches full-screen.</li>
            </ol>
          </Card>

          <Card icon={<Monitor className="w-5 h-5 text-emerald-400" />} title="Windows / macOS — Chrome / Edge" highlight={platform === 'windows' || platform === 'mac'}>
            <ol className="text-sm text-white/70 space-y-2 list-decimal ml-4">
              <li>Open Suvio in Chrome, Edge, Brave or Arc.</li>
              <li>Look for the <b>install icon</b> in the address bar (a monitor with a down arrow), or use the menu → <b>Install Suvio</b>.</li>
              <li>Suvio opens in its own window with a Dock/Start-menu icon.</li>
            </ol>
            <div className="mt-4"><InstallButton /></div>
          </Card>

          <Card icon={<Smartphone className="w-5 h-5 text-purple-400" />} title="Prefer a signed .apk?">
            <p className="text-sm text-white/70">
              For enterprise distribution or side-loading, Suvio can be wrapped as a signed Android APK using
              Google's official <b>Bubblewrap</b> (TWA) tool. This produces a <code className="text-xs bg-white/10 px-1 rounded">.aab</code> and
              <code className="text-xs bg-white/10 px-1 rounded ml-1">.apk</code> file backed by the same PWA — the standard technique used by the ChatGPT Android app.
            </p>
            <ol className="mt-3 text-sm text-white/70 space-y-2 list-decimal ml-4">
              <li>Install Bubblewrap: <code className="text-xs bg-white/10 px-1 rounded">npm i -g @bubblewrap/cli</code></li>
              <li>Run <code className="text-xs bg-white/10 px-1 rounded">bubblewrap init --manifest={origin || 'https://suvio.app'}/manifest.webmanifest</code></li>
              <li>Run <code className="text-xs bg-white/10 px-1 rounded">bubblewrap build</code> — produces <code className="text-xs bg-white/10 px-1 rounded">app-release-signed.apk</code>.</li>
              <li>Upload the generated <code className="text-xs bg-white/10 px-1 rounded">assetlinks.json</code> to <code className="text-xs bg-white/10 px-1 rounded">/.well-known/</code> to enable "Open in App".</li>
            </ol>
            <a
              href="https://www.pwabuilder.com/?url=https%3A%2F%2F37f7ddc1-e703-4af4-bb50-b0dd96fd0aee.preview.emergentagent.com%2F"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm accent-bg rounded-lg px-3 py-2 font-semibold"
              data-testid="pwabuilder-apk"
            >
              <Download className="w-4 h-4"/> Generate APK with PWABuilder
            </a>
          </Card>
        </div>

        <div className="mt-12 text-center text-xs text-white/40">
          Already have Suvio installed? Just launch it from your home screen — this page will detect it and offer "Open App" instead.
        </div>
      </div>
    </div>
  );
}

function Card({ icon, title, children, highlight }) {
  return (
    <div className={`glass-strong rounded-2xl p-6 border ${highlight ? 'accent-border' : 'border-white/10'}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-white/5 grid place-items-center">{icon}</div>
        <h3 className="font-semibold">{title}</h3>
        {highlight && <span className="ml-auto text-[10px] uppercase tracking-widest text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5">Your device</span>}
      </div>
      {children}
    </div>
  );
}
