'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Activity, RefreshCcw, CheckCircle2, AlertTriangle, Circle } from 'lucide-react';

const LABELS = {
  database: 'Database',
  authentication: 'Authentication',
  aiAssistant: 'Suvio AI',
  reminderCalls: 'AI Reminder Calls',
  phoneOtp: 'Phone OTP',
  payments: 'Payments (Razorpay)',
  documentUploads: 'Document Uploads',
};

export default function Status() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    try {
      const r = await fetch('/api/support/status');
      setData(await r.json());
    } catch {
      setData({ overall: 'degraded', checks: {} });
    } finally { setBusy(false); }
  }
  useEffect(() => { refresh(); }, []);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/dashboard/help" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition mb-6" data-testid="status-back">
        <ArrowLeft className="w-4 h-4" /> Help Center
      </Link>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-400 to-purple-500 grid place-items-center"><Activity className="w-5 h-5 text-white" /></div>
        <div>
          <h1 className="text-3xl font-semibold">System Status</h1>
          <p className="text-sm text-white/50">Reflects application health checks only. Not a real-time uptime monitor.</p>
        </div>
        <button onClick={refresh} disabled={busy} className="ml-auto text-sm bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2 transition" data-testid="status-refresh">
          <RefreshCcw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {data && (
        <>
          <div className={`mt-6 rounded-2xl p-5 border flex items-center gap-4 ${data.overall === 'all_systems_normal' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
            {data.overall === 'all_systems_normal' ? <CheckCircle2 className="w-6 h-6 text-emerald-300" /> : <AlertTriangle className="w-6 h-6 text-amber-300" />}
            <div className="flex-1">
              <div className="font-semibold">{data.overall === 'all_systems_normal' ? 'All systems normal' : 'Some services degraded'}</div>
              <div className="text-xs text-white/50">Last checked {new Date(data.at).toLocaleString()}</div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 overflow-hidden">
            {Object.entries(data.checks).map(([k, v], i, arr) => (
              <div key={k} className={`flex items-center gap-3 px-5 py-3.5 ${i < arr.length - 1 ? 'border-b border-white/5' : ''}`} data-testid={`status-row-${k}`}>
                <StatusDot state={v} />
                <div className="flex-1 text-sm">{LABELS[k] || k}</div>
                <div className={`text-xs ${v === 'operational' ? 'text-emerald-300' : v === 'degraded' ? 'text-amber-300' : 'text-white/40'}`}>
                  {v.replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-xs text-white/40">
            "Not configured" means the underlying provider isn't wired in this environment — the feature will surface a friendly message when you try to use it.
          </div>
        </>
      )}
    </div>
  );
}

function StatusDot({ state }) {
  if (state === 'operational') return <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_theme(colors.emerald.400)]" />;
  if (state === 'degraded') return <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_theme(colors.amber.400)]" />;
  return <Circle className="w-2.5 h-2.5 text-white/30" />;
}
