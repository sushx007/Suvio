'use client';
import useSWR from 'swr';
import { PhoneCall, Loader2, PhoneOff, CheckCircle2, AlertCircle } from 'lucide-react';

const fetcher = url => fetch(url).then(r => r.json());

export default function CallHistoryPage() {
  const { data } = useSWR('/api/calls', fetcher, { refreshInterval: 15000 });
  const items = data?.items || [];

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-3xl font-semibold tracking-tight">AI Call History</h1>
      <p className="text-white/50 text-sm mt-1">Every reminder call the AI has placed (or attempted) on your behalf.</p>

      <div className="mt-8 glass rounded-2xl divide-y divide-white/5">
        {items.map(c => (
          <div key={c.id} className="p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${statusColor(c.status)}`}>
              {statusIcon(c.status)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{humanPurpose(c.type, c.purpose)}</div>
              <div className="text-xs text-white/50 truncate mt-0.5">{c.message}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs text-white/60">{new Date(c.createdAt).toLocaleString()}</div>
              <div className="text-[10px] mt-0.5 uppercase tracking-wider text-white/40">{c.status}</div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="p-10 text-center text-white/40 text-sm">
            <PhoneOff className="w-6 h-6 mx-auto mb-2"/>
            No AI calls yet. Enable water/meal/workout reminders or attach a reminder to a task.
          </div>
        )}
      </div>
    </div>
  );
}

function humanPurpose(type, purpose) {
  const m = {
    water: 'Water reminder call',
    meal: 'Meal reminder call',
    workout: 'Workout reminder call',
    task: 'Task reminder call',
    task_followup: 'Task follow-up call',
  };
  return m[type] || purpose || 'AI call';
}
function statusColor(s) {
  if (s === 'completed' || s === 'in-progress' || s === 'queued' || s === 'ringing') return 'bg-emerald-500/15 text-emerald-300';
  if (s === 'failed' || s === 'busy' || s === 'no-answer') return 'bg-rose-500/15 text-rose-300';
  return 'bg-white/5 text-white/60';
}
function statusIcon(s) {
  if (s === 'failed' || s === 'busy' || s === 'no-answer') return <AlertCircle className="w-4 h-4"/>;
  if (s === 'logged_only') return <PhoneCall className="w-4 h-4"/>;
  return <PhoneCall className="w-4 h-4"/>;
}
