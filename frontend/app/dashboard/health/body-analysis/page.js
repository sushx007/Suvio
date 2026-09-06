'use client';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Upload, Loader2, ImageIcon, Info, Target, Lock } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const fetcher = url => fetch(url).then(r => r.json());

const GOALS = [
  { id: 'lose_weight', label: 'Lose Weight' },
  { id: 'build_muscle', label: 'Build Muscle' },
  { id: 'body_recomp', label: 'Body Recomposition' },
  { id: 'improve_fitness', label: 'Improve Fitness' },
];

export default function BodyAnalysisPage() {
  const { data: history, mutate } = useSWR('/api/health/body-analysis', fetcher);
  const { data: plan } = useSWR('/api/plan/status', fetcher);
  const gated = plan && !plan.gates?.bodyAnalysis;
  const [goal, setGoal] = useState('improve_fitness');
  const [front, setFront] = useState(null);
  const [side, setSide] = useState(null);
  const [running, setRunning] = useState(false);
  const [latest, setLatest] = useState(null);

  async function analyze() {
    if (!front) { toast.error('Please upload a front-view photo.'); return; }
    setRunning(true);
    try {
      const fd = new FormData();
      fd.append('goal', goal);
      fd.append('front', front);
      if (side) fd.append('side', side);
      const r = await fetch('/api/health/body-analysis', { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Analysis failed');
      toast.success('Analysis ready');
      setLatest(d.item);
      mutate();
    } catch (e) { toast.error(e.message); } finally { setRunning(false); }
  }

  const items = history?.items || [];

  if (gated) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center">
        <Lock className="w-10 h-10 mx-auto text-white/40 mb-4"/>
        <h1 className="text-2xl font-semibold">AI Body Analysis is a Standard / Premium feature</h1>
        <p className="text-white/50 mt-2">Upgrade to unlock AI vision analysis, workout & diet plans.</p>
        <Link href="/dashboard/upgrade" className="mt-6 inline-block bg-white text-black rounded-xl px-5 py-2.5 font-semibold hover:bg-white/90 transition">Upgrade</Link>
      </div>
    );
  }

  const view = latest || items[0];

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-3xl font-semibold tracking-tight">AI Body Analysis</h1>
      <p className="text-white/50 text-sm mt-1">Upload a mirror selfie. AI vision estimates composition & suggests focus areas. Not medical advice.</p>

      <div className="mt-8 grid md:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-6 md:col-span-2">
          <div className="text-sm font-medium mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-sky-400"/> What is your primary goal?</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {GOALS.map(g => (
              <button key={g.id} onClick={()=>setGoal(g.id)} className={`rounded-xl px-3 py-2 text-sm transition ${goal===g.id ? 'bg-white text-black' : 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/10'}`} data-testid={`goal-${g.id}`}>
                {g.label}
              </button>
            ))}
          </div>
          <div className="mt-6 grid md:grid-cols-2 gap-3">
            <FileDrop label="Front view (required)" file={front} onChange={setFront} testId="front-file"/>
            <FileDrop label="Side view (optional)" file={side} onChange={setSide} testId="side-file"/>
          </div>
          <button onClick={analyze} disabled={running || !front} className="mt-6 bg-white text-black rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-white/90 disabled:opacity-40 flex items-center gap-2" data-testid="analyze-btn">
            {running ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>} Analyze
          </button>
          <div className="mt-3 flex items-start gap-2 text-xs text-white/40"><Info className="w-3.5 h-3.5 shrink-0 mt-0.5"/><span>Your images are stored securely for progress tracking. This is an AI visual estimate — not a medical diagnosis.</span></div>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="text-sm font-medium mb-3">History · {items.length}</div>
          <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
            {items.map(it => (
              <button key={it.id} onClick={()=>setLatest(it)} className="w-full text-left rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 text-xs transition">
                <div className="font-medium">{new Date(it.createdAt).toLocaleDateString()}</div>
                <div className="text-white/50 mt-0.5">{it.goal.replace('_',' ')}</div>
              </button>
            ))}
            {items.length===0 && <div className="text-xs text-white/40">No analyses yet</div>}
          </div>
        </div>
      </div>

      {view && (
        <div className="mt-8 glass-strong rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-semibold">Analysis</div>
              <div className="text-xs text-white/40">{new Date(view.createdAt).toLocaleString()}</div>
            </div>
            <div className="text-xs text-white/50">Goal: <span className="text-white">{view.goal.replace('_',' ')}</span></div>
          </div>
          {view.analysis?.error ? (
            <div className="text-sm text-rose-400">{view.analysis.error}</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-2">
                <Kv k="Estimated body fat" v={view.analysis?.estimatedBodyFatPct ? view.analysis.estimatedBodyFatPct + '%' : '—'}/>
                <Kv k="Body type" v={view.analysis?.bodyType || '—'}/>
                <Kv k="Posture" v={view.analysis?.posture}/>
                <Kv k="Muscle balance" v={view.analysis?.muscleBalance}/>
                <Kv k="Weight distribution" v={view.analysis?.weightDistribution}/>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-white/40 mb-2">Observations</div>
                <ul className="space-y-1 mb-4">{(view.analysis?.observations||[]).map((o,i)=><li key={i} className="text-white/80">• {o}</li>)}</ul>
                <div className="text-xs uppercase tracking-widest text-white/40 mb-2">Areas to improve</div>
                <ul className="space-y-1">{(view.analysis?.areasToImprove||[]).map((o,i)=><li key={i} className="text-white/80">• {o}</li>)}</ul>
              </div>
            </div>
          )}
          <div className="mt-4 text-[11px] text-white/40 italic">{view.analysis?.disclaimer || 'This is an AI visual estimate, not a medical diagnosis.'}</div>
        </div>
      )}
    </div>
  );
}

function FileDrop({ label, file, onChange, testId }) {
  return (
    <label className="block cursor-pointer" data-testid={testId}>
      <div className="text-xs text-white/50 mb-1">{label}</div>
      <div className="glass rounded-xl border border-dashed border-white/15 hover:border-sky-400/50 transition p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-white/5 grid place-items-center"><ImageIcon className="w-4 h-4 text-white/50"/></div>
        <div className="text-sm text-white/80 flex-1 truncate">{file ? file.name : 'Choose image…'}</div>
      </div>
      <input type="file" accept="image/*" className="hidden" onChange={e => onChange(e.target.files?.[0] || null)} />
    </label>
  );
}

function Kv({ k, v }) {
  return <div className="flex items-baseline gap-2"><div className="text-xs text-white/40 w-40 shrink-0">{k}</div><div className="text-sm text-white/90">{v || '—'}</div></div>;
}
