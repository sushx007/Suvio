'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { Salad, Loader2, Sparkles, Lock } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const fetcher = url => fetch(url).then(r => r.json());

export default function DietPlanPage() {
  const { data, mutate } = useSWR('/api/health/diet-plan', fetcher);
  const { data: plan } = useSWR('/api/plan/status', fetcher);
  const gated = plan && !plan.gates?.aiDietPlan;
  const [goal, setGoal] = useState('improve_fitness');
  const [activity, setActivity] = useState('moderate');
  const [diet, setDiet] = useState('omnivore');
  const [restrictions, setRestrictions] = useState('');
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    try {
      const r = await fetch('/api/health/diet-plan/generate', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ goal, activityLevel: activity, dietaryPreference: diet, restrictions: restrictions ? restrictions.split(',').map(x=>x.trim()).filter(Boolean) : [] }),
      });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      toast.success('Diet plan generated'); mutate();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }

  if (gated) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center">
        <Lock className="w-10 h-10 mx-auto text-white/40 mb-4"/>
        <h1 className="text-2xl font-semibold">AI Diet Plan is a Standard / Premium feature</h1>
        <Link href="/dashboard/upgrade" className="mt-6 inline-block bg-white text-black rounded-xl px-5 py-2.5 font-semibold hover:bg-white/90 transition">Upgrade</Link>
      </div>
    );
  }

  const item = data?.item;
  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-sky-500 grid place-items-center"><Salad className="w-5 h-5 text-white"/></div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">AI Diet Plan</h1>
          <p className="text-white/50 text-sm mt-0.5">Personalized daily calories, macros & meal suggestions.</p>
        </div>
      </div>

      <div className="mt-8 glass rounded-2xl p-6 grid md:grid-cols-4 gap-3 items-end">
        <Field label="Goal">
          <select value={goal} onChange={e=>setGoal(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm">
            <option value="lose_weight">Lose Weight</option>
            <option value="build_muscle">Build Muscle</option>
            <option value="body_recomp">Body Recomposition</option>
            <option value="improve_fitness">Improve Fitness</option>
          </select>
        </Field>
        <Field label="Activity level">
          <select value={activity} onChange={e=>setActivity(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm">
            <option value="sedentary">Sedentary</option><option value="light">Light</option><option value="moderate">Moderate</option><option value="active">Active</option><option value="very_active">Very active</option>
          </select>
        </Field>
        <Field label="Dietary preference">
          <select value={diet} onChange={e=>setDiet(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm">
            <option value="omnivore">Omnivore</option><option value="vegetarian">Vegetarian</option><option value="vegan">Vegan</option><option value="pescatarian">Pescatarian</option><option value="keto">Keto</option>
          </select>
        </Field>
        <Field label="Restrictions (comma separated)">
          <input value={restrictions} onChange={e=>setRestrictions(e.target.value)} placeholder="e.g. lactose, gluten" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"/>
        </Field>
        <button onClick={generate} disabled={busy} className="md:col-span-4 mt-2 bg-white text-black rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-white/90 disabled:opacity-40 flex items-center justify-center gap-2 md:w-auto md:ml-auto" data-testid="generate-diet">
          {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>} {item ? 'Regenerate' : 'Generate plan'}
        </button>
      </div>

      {item && (
        <div className="mt-8">
          <div className="text-xs text-white/40 mb-3">Generated {new Date(item.generatedAt).toLocaleString()}</div>
          <div className="grid md:grid-cols-5 gap-3">
            <Stat label="Calories" value={`${item.plan?.dailyCalories || '—'} kcal`}/>
            <Stat label="Protein" value={`${item.plan?.protein_g || '—'} g`}/>
            <Stat label="Carbs" value={`${item.plan?.carbs_g || '—'} g`}/>
            <Stat label="Fats" value={`${item.plan?.fats_g || '—'} g`}/>
            <Stat label="Water" value={`${item.plan?.waterMl || '—'} ml`}/>
          </div>
          <div className="mt-6 grid md:grid-cols-2 gap-4">
            {(item.plan?.meals || []).map((m, i) => (
              <div key={i} className="glass rounded-2xl p-5">
                <div className="text-sm font-semibold">{m.name}</div>
                <div className="text-sm text-white/80 mt-1">{m.suggestion}</div>
                {m.kcal && <div className="mt-2 text-xs text-emerald-400">{m.kcal} kcal</div>}
              </div>
            ))}
          </div>
          {item.plan?.notes && <div className="mt-6 glass rounded-2xl p-5 text-sm text-white/70">{item.plan.notes}</div>}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) { return <div><div className="text-xs text-white/50 mb-1">{label}</div>{children}</div>; }
function Stat({ label, value }) { return <div className="glass rounded-2xl p-5"><div className="text-xs text-white/40">{label}</div><div className="text-2xl font-semibold mt-1">{value}</div></div>; }
