'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

// Global error boundary. Prevents any runtime crash inside the App Router
// tree from displaying Next.js's default red error page. Critical for the
// AI assistant, which touches many browser APIs (SpeechRecognition, media
// permissions) that can throw on unsupported devices.
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // Server-log for debugging without leaking to the client.
    console.error('[Suvio] app error:', error?.message, error?.digest);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#09090B] text-white grid place-items-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto bg-gradient-to-br from-rose-500/40 to-amber-500/30 grid place-items-center mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-semibold">Something went sideways.</h1>
          <p className="text-white/60 mt-2 text-sm">
            Suvio hit an unexpected error and safely caught it. The rest of the app is still working — you can retry, or head back to your dashboard.
          </p>
          {error?.digest && (
            <div className="mt-3 text-[10px] text-white/30 font-mono">ref: {error.digest}</div>
          )}
          <div className="mt-6 flex gap-3 justify-center">
            <button
              onClick={() => reset()}
              className="inline-flex items-center gap-2 accent-bg px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition"
              data-testid="global-error-retry"
            >
              <RefreshCcw className="w-4 h-4" /> Try again
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 border border-white/15 px-4 py-2 rounded-lg text-sm hover:bg-white/5 transition"
              data-testid="global-error-home"
            >
              <Home className="w-4 h-4" /> Dashboard
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
