'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { Dumbbell, Loader2, Sparkles, Lock, Camera, Crown, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const fetcher = url => fetch(url).then(r => r.json());

export default function WorkoutPlanPage() {
  const { data, mutate } = useSWR('/api/health/workout-plan', fetcher);
  const { data: plan } = useSWR('/api/plan/status', fetcher);
  const gated = plan && !plan.gates?.aiWorkoutPlan;
  const [goal, setGoal] = useState('improve_fitness');
  const [days, setDays] = useState(4);
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    try {
      const r = await fetch('/api/health/workout-plan/generate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ goal, daysPerWeek: days }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      toast.success('Workout plan generated'); mutate();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }

  if (gated) return <UpgradeGate feature="AI Workout Plan"/>;

  const item = data?.item;
  const isPremium = plan?.tier === 'premium';

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-purple-500 grid place-items-center"><Dumbbell className="w-5 h-5 text-white"/></div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">AI Workout Plan</h1>
          <p className="text-white/50 text-sm mt-0.5">Personalized weekly training tailored to your goal.</p>
        </div>
      </div>

      <div className="mt-8 glass rounded-2xl p-6 flex flex-wrap items-end gap-3">
        <div>
          <div className="text-xs text-white/50 mb-1">Goal</div>
          <select value={goal} onChange={e=>setGoal(e.target.value)} className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm">
            <option value="lose_weight">Lose Weight</option>
            <option value="build_muscle">Build Muscle</option>
            <option value="body_recomp">Body Recomposition</option>
            <option value="improve_fitness">Improve Fitness</option>
          </select>
        </div>
        <div>
          <div className="text-xs text-white/50 mb-1">Days / week</div>
          <input type="number" min={2} max={7} value={days} onChange={e=>setDays(Number(e.target.value))} className="w-24 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"/>
        </div>
        <button onClick={generate} disabled={busy} className="ml-auto bg-white text-black rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-white/90 disabled:opacity-40 flex items-center gap-2" data-testid="generate-workout">
          {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>} {item ? 'Regenerate' : 'Generate plan'}
        </button>
      </div>

      {item && (
        <div className="mt-8 space-y-4">
          <div className="text-xs text-white/40">Generated {new Date(item.generatedAt).toLocaleString()}</div>
          <div className="grid md:grid-cols-2 gap-4">
            {(item.plan?.weeklySchedule || []).map((d, i) => (
              <div key={i} className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold">{d.day}</div>
                  <div className="text-xs text-white/50">{d.focus}</div>
                </div>
                <div className="space-y-2">
                  {(d.exercises || []).map((e, ei) => (
                    <div key={ei} className="flex items-center gap-3 text-sm">
                      <div className="flex-1">{e.name}</div>
                      <div className="text-xs text-white/50">{e.sets} × {e.reps}</div>
                      <div className="text-xs text-white/40">{e.rest}</div>
                    </div>
                  ))}
                </div>
                {d.cardio && <div className="mt-3 text-xs text-sky-300">Cardio: {d.cardio}</div>}
                {d.recovery && <div className="mt-1 text-xs text-emerald-300">Recovery: {d.recovery}</div>}
              </div>
            ))}
          </div>
          {item.plan?.notes && <div className="glass rounded-2xl p-5 text-sm text-white/70">{item.plan.notes}</div>}
        </div>
      )}

      {/* V2.1 — AI Personal Trainer (Premium-only section) */}
      <AIPersonalTrainerSection isPremium={isPremium} />
    </div>
  );
}

function AIPersonalTrainerSection({ isPremium }) {
  return (
    <div className="mt-10" data-testid="ai-trainer-section">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-purple-500 grid place-items-center">
          <Crown className="w-4 h-4 text-black"/>
        </div>
        <h2 className="text-xl font-semibold tracking-tight">AI Personal Trainer</h2>
        <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-200">Premium</span>
      </div>

      {isPremium ? (
        <Link href="/dashboard/health/trainer" className="glass rounded-2xl p-6 flex items-center gap-4 hover:bg-white/5 transition group" data-testid="ai-trainer-open">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-sky-400 to-purple-500 grid place-items-center shrink-0">
            <Camera className="w-6 h-6 text-black"/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold">Start AI Workout</div>
            <p className="text-sm text-white/60 mt-0.5">Real-time pose detection · rep counting · voice coach · animated form correction for squats, push-ups, lunges, plank, shoulder press, bicep curls, jumping jacks & burpees.</p>
          </div>
          <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-white group-hover:translate-x-1 transition"/>
        </Link>
      ) : (
        <div className="glass rounded-2xl p-6 border border-amber-500/20" data-testid="ai-trainer-locked">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-purple-500 grid place-items-center shrink-0">
              <Lock className="w-6 h-6 text-black"/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-semibold flex items-center gap-2">Live AI Personal Trainer <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-200">Premium</span></div>
              <p className="text-sm text-white/60 mt-1">Get a private, on-device pose coach that counts reps, watches your form and speaks encouraging corrections in real time — for 8 exercises including plank, shoulder press, bicep curls, jumping jacks and burpees.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/70">📷 Live camera</span>
                <span className="text-xs px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/70">🔊 Voice coach</span>
                <span className="text-xs px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/70">🎯 Rep &amp; set counter</span>
                <span className="text-xs px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/70">🩻 Posture guide</span>
              </div>
              <Link href="/dashboard/upgrade" className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-purple-500 text-black rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 transition" data-testid="ai-trainer-upgrade">
                <Crown className="w-4 h-4"/> Upgrade to Premium
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UpgradeGate({ feature }) {
  return (
    <div className="max-w-3xl mx-auto p-8 text-center">
      <Lock className="w-10 h-10 mx-auto text-white/40 mb-4"/>
      <h1 className="text-2xl font-semibold">{feature} is a Standard / Premium feature</h1>
      <Link href="/dashboard/upgrade" className="mt-6 inline-block bg-white text-black rounded-xl px-5 py-2.5 font-semibold hover:bg-white/90 transition">Upgrade</Link>
    </div>
  );
}
