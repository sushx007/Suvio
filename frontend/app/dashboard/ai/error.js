'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCcw, Brain } from 'lucide-react';

// Route-scoped error boundary for the Suvio AI assistant. Any client-side
// crash (speech-recognition throw, streaming failure, unsupported browser
// API) is caught here so the rest of the dashboard stays usable.
export default function AIError({ error, reset }) {
  useEffect(() => {
    console.error('[SuvioAI] page error:', error?.message, error?.digest);
  }, [error]);

  const msg = error?.message || 'The AI assistant hit an unexpected error.';

  return (
    <div className="min-h-[70vh] grid place-items-center px-6">
      <div className="max-w-md w-full glass-strong rounded-2xl p-8 text-center">
        <div className="w-12 h-12 rounded-2xl mx-auto bg-gradient-to-br from-sky-400 to-purple-500 grid place-items-center mb-4">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5 mb-3">
          <AlertTriangle className="w-3 h-3" /> Suvio AI is briefly offline
        </div>
        <h1 className="text-xl font-semibold">Let&apos;s try that again</h1>
        <p className="text-sm text-white/60 mt-2">{msg}</p>
        <p className="text-xs text-white/40 mt-3">
          The rest of Suvio is still fully working — you can retry, or come back in a moment.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 accent-bg px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition"
            data-testid="ai-error-retry"
          >
            <RefreshCcw className="w-4 h-4" /> Retry
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 border border-white/15 px-4 py-2 rounded-lg text-sm hover:bg-white/5 transition"
            data-testid="ai-error-back"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
