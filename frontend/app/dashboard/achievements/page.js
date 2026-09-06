'use client';
import useSWR from 'swr';
import { Trophy, Lock, Sparkles } from 'lucide-react';

const fetcher = url => fetch(url).then(r => r.json());

export default function Achievements() {
  const { data } = useSWR('/api/achievements', fetcher, { refreshInterval: 10000 });
  const items = data?.items || [];
  const unlocked = data?.unlocked || 0;
  const total = data?.total || items.length;
  const pct = total ? Math.round(unlocked/total*100) : 0;

  const byCat = items.reduce((acc, i) => { (acc[i.cat] = acc[i.cat] || []).push(i); return acc; }, {});

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
            <Trophy className="w-7 h-7 accent-text"/> Achievements
          </h1>
          <p className="text-white/50 text-sm mt-1">Earn badges as you build your operating system.</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold">{unlocked}<span className="text-white/40 text-lg">/{total}</span></div>
          <div className="text-xs text-white/50">unlocked</div>
        </div>
      </div>

      <div className="mt-6 glass-strong rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium">Overall completion</div>
          <div className="text-sm accent-text font-semibold">{pct}%</div>
        </div>
        <div className="h-3 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full accent-bg transition-all duration-700" style={{ width: `${pct}%` }}/>
        </div>
      </div>

      {Object.entries(byCat).map(([cat, list]) => (
        <div key={cat} className="mt-8">
          <div className="text-xs uppercase tracking-wider text-white/40 mb-3">{cat}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {list.map(a => (
              <div key={a.id} className={`glass rounded-2xl p-4 transition-all ${a.unlocked ? 'ring-1 accent-ring' : 'opacity-70'}`}>
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-xl grid place-items-center text-2xl ${a.unlocked ? '' : 'grayscale opacity-50'}`} style={{ background: a.unlocked ? 'rgba(var(--accent-rgb), 0.15)' : 'rgba(255,255,255,0.05)' }}>
                    {a.unlocked ? a.icon : <Lock className="w-4 h-4 text-white/30"/>}
                  </div>
                  {a.unlocked && <Sparkles className="w-3 h-3 accent-text"/>}
                </div>
                <div className="mt-3 text-sm font-semibold">{a.name}</div>
                <div className="text-xs text-white/50 mt-0.5">{a.desc}</div>
                <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div className={`h-full transition-all ${a.unlocked ? 'accent-bg' : 'bg-white/30'}`} style={{ width: `${a.progress*100}%` }}/>
                </div>
                <div className="mt-1 text-[10px] text-white/40">{a.current}/{a.target}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
