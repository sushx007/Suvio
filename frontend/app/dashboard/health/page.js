'use client';
import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Droplet, Scale, Plus, Loader2, Settings2, Save, Camera, Dumbbell, Salad, Sparkles as Spark } from 'lucide-react';
import { toast } from 'sonner';

const fetcher = url => fetch(url).then(r => r.json());

export default function Health() {
  const { data, mutate } = useSWR('/api/health/summary', fetcher, { refreshInterval: 5000 });
  const { data: settingsData, mutate: mutateSettings } = useSWR('/api/health/settings', fetcher);
  const settings = settingsData?.settings || {};

  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  async function addWater(ml) {
    await fetch('/api/health/water', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ml }) });
    toast.success(`+${ml}ml water`); mutate();
  }
  async function saveWeight(e) {
    e.preventDefault();
    if (!weight) return;
    setSaving(true);
    await fetch('/api/health/weight', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ kg: Number(weight) }) });
    setWeight(''); setSaving(false); toast.success('Weight logged'); mutate();
  }

  const water = data?.waterTotal || 0;
  const goal = data?.waterGoal || 2500;
  const pct = Math.min((water/goal)*100, 100);
  const weights = data?.weights || [];
  const bmi = settings.height && data?.latestWeight ? (data.latestWeight / Math.pow(settings.height/100, 2)).toFixed(1) : null;
  const age = settings.dob ? Math.floor((Date.now() - new Date(settings.dob).getTime()) / (365.25*24*3600*1000)) : null;

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Health</h1>
          <p className="text-white/50 text-sm mt-1">Water, weight, wellness.</p>
        </div>
        <button onClick={()=>setShowSettings(s=>!s)} className="flex items-center gap-2 text-sm glass hover:bg-white/10 rounded-lg px-3 py-2 transition">
          <Settings2 className="w-4 h-4"/> {showSettings?'Hide':'Edit'} profile
        </button>
      </div>

      {showSettings && <HealthSettings settings={settings} onSave={async (s)=>{ await fetch('/api/health/settings', {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(s)}); toast.success('Saved'); mutateSettings(); mutate(); }} />}

      {/* V1.2 AI health module cards */}
      <div className="mt-6 grid md:grid-cols-3 gap-3">
        <AIModuleCard href="/dashboard/health/body-analysis" icon={Camera} title="AI Body Analysis" desc="Upload a selfie, get composition insights" tint="from-sky-500/20 to-purple-500/10" testId="module-body-analysis"/>
        <AIModuleCard href="/dashboard/health/workout" icon={Dumbbell} title="AI Workout Plan" desc="Personalized weekly training plan" tint="from-emerald-500/20 to-sky-500/10" testId="module-workout"/>
        <AIModuleCard href="/dashboard/health/diet" icon={Salad} title="AI Diet Plan" desc="Calories, macros & meal ideas" tint="from-amber-500/20 to-rose-500/10" testId="module-diet"/>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <MiniStat label="Height" value={settings.height ? `${settings.height} cm` : '—'} />
        <MiniStat label="Weight" value={data?.latestWeight ? `${data.latestWeight} kg` : (settings.weight ? `${settings.weight} kg` : '—')} />
        <MiniStat label="BMI" value={bmi || '—'} tint={bmi ? (bmi<18.5?'text-sky-300':bmi<25?'text-emerald-300':bmi<30?'text-amber-300':'text-rose-300') : ''} />
        <MiniStat label="Age" value={age ?? '—'} />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4"><Droplet className="w-5 h-5 text-cyan-400"/><div className="text-sm font-medium">Water today</div></div>
          <div className="text-4xl font-semibold">{(water/1000).toFixed(2)}<span className="text-lg text-white/40">L</span></div>
          <div className="text-xs text-white/50 mt-1">Goal {(goal/1000).toFixed(1)}L · {pct.toFixed(0)}%</div>
          <div className="mt-4 h-2 rounded-full bg-white/5 overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-400 to-sky-400 transition-all" style={{width: `${pct}%`}} /></div>
          <div className="mt-5 flex gap-2">
            {[250, 500, 1000].map(ml => (
              <button key={ml} onClick={()=>addWater(ml)} className="flex-1 glass hover:bg-white/10 rounded-lg py-2 text-sm transition">+{ml}ml</button>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4"><Scale className="w-5 h-5 text-purple-400"/><div className="text-sm font-medium">Weight</div></div>
          <div className="text-4xl font-semibold">{data?.latestWeight ?? '—'}<span className="text-lg text-white/40"> kg</span></div>
          <div className="text-xs text-white/50 mt-1">{weights.length} recent logs</div>
          <form onSubmit={saveWeight} className="mt-5 flex gap-2">
            <input type="number" step="0.1" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="Log weight (kg)" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none" />
            <button disabled={saving} className="bg-white text-black rounded-lg px-4 text-sm font-medium hover:bg-white/90 disabled:opacity-50 flex items-center gap-1">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Plus className="w-3.5 h-3.5"/>} Log
            </button>
          </form>
          {weights.length > 1 && (
            <div className="mt-6 flex items-end gap-1 h-16">
              {weights.slice(0,20).reverse().map((w,i) => {
                const min = Math.min(...weights.map(x=>x.kg));
                const max = Math.max(...weights.map(x=>x.kg));
                const h = max===min ? 50 : ((w.kg-min)/(max-min))*100;
                return <div key={i} className="flex-1 bg-gradient-to-t from-purple-500/40 to-purple-400 rounded-t" style={{height:`${Math.max(h,10)}%`}}/>;
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, tint }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-xs text-white/50">{label}</div>
      <div className={`text-2xl font-semibold mt-2 ${tint||''}`}>{value}</div>
    </div>
  );
}

function AIModuleCard({ href, icon: Icon, title, desc, tint, testId }) {
  return (
    <Link href={href} className={`glass rounded-2xl p-5 hover:scale-[1.01] transition bg-gradient-to-br ${tint}`} data-testid={testId}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/5 grid place-items-center"><Icon className="w-5 h-5 text-white"/></div>
        <div>
          <div className="text-sm font-semibold flex items-center gap-1.5">{title}<Spark className="w-3 h-3 text-sky-400"/></div>
          <div className="text-xs text-white/60 mt-0.5">{desc}</div>
        </div>
      </div>
    </Link>
  );
}

function HealthSettings({ settings, onSave }) {
  const [height, setHeight] = useState(settings.height || '');
  const [weight, setWeight] = useState(settings.weight || '');
  const [dob, setDob] = useState(settings.dob || '');
  const [gender, setGender] = useState(settings.gender || 'other');
  const [waterGoal, setWaterGoal] = useState(settings.waterGoal || 2500);
  const [sleepGoal, setSleepGoal] = useState(settings.sleepGoal || 8);
  const [stepGoal, setStepGoal] = useState(settings.stepGoal || 10000);
  return (
    <div className="mt-6 glass-strong rounded-2xl p-6">
      <div className="text-sm font-medium mb-4">Health profile</div>
      <div className="grid md:grid-cols-4 gap-3">
        <F label="Height (cm)" v={height} on={setHeight} t="number" />
        <F label="Weight (kg)" v={weight} on={setWeight} t="number" />
        <F label="DOB" v={dob} on={setDob} t="date" />
        <div>
          <div className="text-xs text-white/50 mb-1">Gender</div>
          <select value={gender} onChange={e=>setGender(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm">
            <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
          </select>
        </div>
        <F label="Water goal (ml)" v={waterGoal} on={setWaterGoal} t="number" />
        <F label="Sleep goal (hrs)" v={sleepGoal} on={setSleepGoal} t="number" />
        <F label="Step goal" v={stepGoal} on={setStepGoal} t="number" />
      </div>
      <button onClick={()=>onSave({ height:Number(height)||0, weight:Number(weight)||0, dob, gender, waterGoal:Number(waterGoal)||2500, sleepGoal:Number(sleepGoal)||8, stepGoal:Number(stepGoal)||10000 })} className="mt-4 bg-white text-black rounded-lg px-4 py-2 text-sm font-medium hover:bg-white/90 flex items-center gap-2">
        <Save className="w-3.5 h-3.5"/> Save
      </button>
    </div>
  );
}
function F({ label, v, on, t='text' }) {
  return (
    <div>
      <div className="text-xs text-white/50 mb-1">{label}</div>
      <input type={t} value={v} onChange={e=>on(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400/60" />
    </div>
  );
}
