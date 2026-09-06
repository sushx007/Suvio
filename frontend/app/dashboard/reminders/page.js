'use client';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Bell, Loader2, Phone, ShieldCheck, PhoneCall, Lock, Globe } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const fetcher = url => fetch(url).then(r => r.json());
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// A curated list of common IANA timezones. If the user's browser timezone
// isn't in the list we still allow saving it (it appears via the option list
// injected at render time). Auto-detection uses Intl.DateTimeFormat.
const TIMEZONES = [
  'UTC',
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Karachi', 'Asia/Dhaka', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Shanghai', 'Asia/Tokyo', 'Asia/Seoul', 'Asia/Jakarta',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome', 'Europe/Moscow', 'Europe/Amsterdam', 'Europe/Zurich', 'Europe/Istanbul',
  'Africa/Cairo', 'Africa/Lagos', 'Africa/Johannesburg', 'Africa/Nairobi',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Anchorage', 'America/Toronto', 'America/Vancouver', 'America/Mexico_City', 'America/Sao_Paulo', 'America/Buenos_Aires',
  'Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth', 'Pacific/Auckland', 'Pacific/Honolulu',
];

export default function RemindersPage() {
  const { data, mutate } = useSWR('/api/reminders/settings', fetcher);
  const { data: plan } = useSWR('/api/plan/status', fetcher);
  const [s, setS] = useState(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    if (data?.settings) {
      // Auto-detect browser timezone on first load if the saved one is the
      // legacy default ("Asia/Kolkata") and the user's browser reports a
      // different one. This makes the app "just work" for global users
      // without touching any other reminder behaviour.
      let s2 = { ...data.settings };
      try {
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (detected && !s2.timezone) s2.timezone = detected;
        // If user has never explicitly set the reminder timezone (still
        // matches the legacy default) and the detected browser tz is
        // different, adopt the detected one silently on first render.
        if (detected && s2._tzAutoDetected !== true && (!s2.timezone || s2.timezone === 'Asia/Kolkata') && detected !== 'Asia/Kolkata') {
          s2.timezone = detected;
          s2._tzAutoDetected = true;
        }
      } catch {}
      setS(s2);
    }
  }, [data]);

  async function sendCode() {
    if (!phone) return toast.error('Enter phone with country code (e.g. +91…)');
    setSending(true);
    try {
      const r = await fetch('/api/auth/phone/send', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ phone }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      setOtpSent(true);
      toast.success(d.devMode ? 'Twilio not configured — dev mode: use code 000000' : 'OTP sent');
    } catch(e){ toast.error(e.message);} finally{ setSending(false);}
  }
  async function confirmCode() {
    setConfirming(true);
    try {
      const r = await fetch('/api/auth/phone/confirm', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ code }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      toast.success('Phone verified'); mutate();
    } catch(e){ toast.error(e.message);} finally{ setConfirming(false);}
  }
  async function save() {
    setSaving(true);
    try {
      const r = await fetch('/api/reminders/settings', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(s) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      toast.success('Reminder settings saved');
    } catch(e){ toast.error(e.message);} finally{ setSaving(false);}
  }
  async function testCall(type) {
    const r = await fetch('/api/reminders/test-call', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type })});
    const d = await r.json(); if (!r.ok) return toast.error(d.error);
    toast.success('Test call queued');
  }

  if (!s) return <div className="p-8"><Loader2 className="w-5 h-5 animate-spin text-white/40"/></div>;

  const gates = plan?.gates || {};
  const usage = plan?.usage;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Reminders & AI Calls</h1>
      <p className="text-white/50 text-sm mt-1">Configure AI phone reminders. Requires a verified phone number.</p>

      {/* V2.1 — Timezone (used for every scheduled reminder) */}
      <div className="mt-6 glass rounded-2xl p-6" data-testid="tz-section">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 grid place-items-center"><Globe className="w-4 h-4 text-sky-400"/></div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Timezone</div>
            <div className="text-xs text-white/50">All reminder calls, notifications and AI scheduling are computed in this timezone. Handles Daylight Saving automatically.</div>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-3 items-end">
          <div>
            <div className="text-xs text-white/50 mb-1">IANA timezone</div>
            <select
              value={s.timezone || 'UTC'}
              onChange={e=>setS({...s, timezone: e.target.value})}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
              data-testid="tz-select"
            >
              {/* Ensure the currently-selected tz appears even if outside the list */}
              {!TIMEZONES.includes(s.timezone) && s.timezone && <option value={s.timezone}>{s.timezone} (current)</option>}
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div className="text-xs text-white/50">
            Browser detected: <span className="text-white/80 font-mono" data-testid="tz-detected">{typeof window !== 'undefined' ? (Intl.DateTimeFormat().resolvedOptions().timeZone || '—') : '—'}</span>
            <button
              type="button"
              onClick={() => {
                try {
                  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
                  if (detected) { setS({...s, timezone: detected}); toast.success(`Timezone set to ${detected}`); }
                } catch { toast.error('Could not detect timezone'); }
              }}
              className="ml-2 text-xs underline text-sky-300 hover:text-sky-200"
              data-testid="tz-use-detected"
            >Use browser timezone</button>
          </div>
        </div>
      </div>

      {/* Phone verification */}
      <div className="mt-6 glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 grid place-items-center"><Phone className="w-4 h-4 text-sky-400"/></div>
          <div>
            <div className="text-sm font-semibold">Phone number</div>
            <div className="text-xs text-white/50">{data.phoneVerified ? <span className="text-emerald-400 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5"/> Verified · {data.phone}</span> : 'Not verified'}</div>
          </div>
        </div>
        {!data.phoneVerified && (
          <div className="grid md:grid-cols-2 gap-3">
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91 98765 43210" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm" data-testid="phone-input"/>
            <button onClick={sendCode} disabled={sending} className="bg-white/10 hover:bg-white/20 rounded-lg px-4 py-2 text-sm disabled:opacity-40 flex items-center justify-center gap-2" data-testid="send-otp">
              {sending && <Loader2 className="w-3.5 h-3.5 animate-spin"/>} Send OTP
            </button>
            {otpSent && <>
              <input value={code} onChange={e=>setCode(e.target.value)} placeholder="6-digit code" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm" data-testid="otp-input"/>
              <button onClick={confirmCode} disabled={confirming} className="bg-white text-black rounded-lg px-4 py-2 text-sm font-semibold hover:bg-white/90 disabled:opacity-40 flex items-center justify-center gap-2" data-testid="confirm-otp">
                {confirming && <Loader2 className="w-3.5 h-3.5 animate-spin"/>} Verify
              </button>
            </>}
          </div>
        )}
      </div>

      {/* Task follow-up */}
      <Section title="AI Task Reminder Calls" subtitle={`AI calls you before a task is due, and again if it becomes overdue. ${usage ? `Used ${usage.taskReminderCallsUsed}/${usage.taskReminderCallsLimit === -1 ? '∞' : usage.taskReminderCallsLimit} this month.` : ''}`}>
        <Toggle label="Enable pre-due call" checked={s.taskFollowup.enabled} onChange={v=>setS({...s, taskFollowup:{...s.taskFollowup, enabled:v}})}/>
        <RangeRow label={`Hours before due: ${s.taskFollowup.hoursBefore}`} value={s.taskFollowup.hoursBefore} min={1} max={24} onChange={v=>setS({...s, taskFollowup:{...s.taskFollowup, hoursBefore:v}})}/>
        <Toggle label="Retry with a call if the task becomes overdue" checked={s.taskFollowup.retryOnOverdue} onChange={v=>setS({...s, taskFollowup:{...s.taskFollowup, retryOnOverdue:v}})}/>
      </Section>

      <Section title="Water Reminder Calls" subtitle="Pro / Standard / Premium" locked={!gates.waterReminderCalls}>
        <Toggle label="Enable hourly water reminders" checked={s.water.enabled} onChange={v=>setS({...s, water:{...s.water, enabled:v}})}/>
        <RangeRow label={`Frequency: every ${s.water.frequencyMinutes} min`} value={s.water.frequencyMinutes} min={30} max={240} step={15} onChange={v=>setS({...s, water:{...s.water, frequencyMinutes:v}})}/>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <NumRow label="Start hour" value={s.water.startHour} onChange={v=>setS({...s, water:{...s.water, startHour:v}})}/>
          <NumRow label="End hour" value={s.water.endHour} onChange={v=>setS({...s, water:{...s.water, endHour:v}})}/>
        </div>
        <DayPicker value={s.water.days} onChange={days=>setS({...s, water:{...s.water, days}})}/>
        <Toggle label="Pause temporarily" checked={s.water.paused} onChange={v=>setS({...s, water:{...s.water, paused:v}})}/>
        <TestBtn type="water" onClick={()=>testCall('water')} disabled={!gates.waterReminderCalls || !data.phoneVerified}/>
      </Section>

      <Section title="Meal Reminder Calls" subtitle="Premium only" locked={!gates.mealReminderCalls}>
        <Toggle label="Enable meal reminders" checked={s.meals.enabled} onChange={v=>setS({...s, meals:{...s.meals, enabled:v}})}/>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <TimeRow label="Breakfast" value={s.meals.breakfast} onChange={v=>setS({...s, meals:{...s.meals, breakfast:v}})}/>
          <TimeRow label="Lunch" value={s.meals.lunch} onChange={v=>setS({...s, meals:{...s.meals, lunch:v}})}/>
          <TimeRow label="Dinner" value={s.meals.dinner} onChange={v=>setS({...s, meals:{...s.meals, dinner:v}})}/>
        </div>
        <Toggle label="Pause temporarily" checked={s.meals.paused} onChange={v=>setS({...s, meals:{...s.meals, paused:v}})}/>
        <TestBtn type="meal" onClick={()=>testCall('meal')} disabled={!gates.mealReminderCalls || !data.phoneVerified}/>
      </Section>

      <Section title="Workout Reminder Calls" subtitle="Premium only" locked={!gates.workoutReminderCalls}>
        <Toggle label="Enable workout reminders" checked={s.workout.enabled} onChange={v=>setS({...s, workout:{...s.workout, enabled:v}})}/>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <TimeRow label="Workout time" value={s.workout.time} onChange={v=>setS({...s, workout:{...s.workout, time:v}})}/>
          <NumRow label="Minutes before" value={s.workout.minutesBefore} onChange={v=>setS({...s, workout:{...s.workout, minutesBefore:v}})}/>
        </div>
        <DayPicker value={s.workout.days} onChange={days=>setS({...s, workout:{...s.workout, days}})}/>
        <TestBtn type="workout" onClick={()=>testCall('workout')} disabled={!gates.workoutReminderCalls || !data.phoneVerified}/>
      </Section>

      <div className="mt-6 glass rounded-2xl p-5 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Vacation mode</div>
          <div className="text-xs text-white/50">Pause all reminder calls while you're away.</div>
        </div>
        <Toggle checked={s.vacationMode} onChange={v=>setS({...s, vacationMode:v})} label=""/>
      </div>

      <button onClick={save} disabled={saving} className="mt-8 bg-white text-black rounded-xl px-6 py-3 font-semibold hover:bg-white/90 disabled:opacity-40 flex items-center gap-2" data-testid="save-reminders">
        {saving && <Loader2 className="w-4 h-4 animate-spin"/>} Save settings
      </button>
    </div>
  );
}

function Section({ title, subtitle, locked, children }) {
  return (
    <div className={`mt-6 glass rounded-2xl p-6 ${locked ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/5 grid place-items-center">{locked ? <Lock className="w-4 h-4 text-white/50"/> : <Bell className="w-4 h-4 text-sky-400"/>}</div>
        <div className="flex-1">
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-white/50">{subtitle}</div>
        </div>
        {locked && <Link href="/dashboard/upgrade" className="text-xs bg-white text-black rounded-lg px-3 py-1.5 font-semibold">Upgrade</Link>}
      </div>
      <fieldset disabled={locked} className="space-y-3">{children}</fieldset>
    </div>
  );
}
function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input type="checkbox" checked={!!checked} onChange={e=>onChange(e.target.checked)} className="peer sr-only"/>
      <span className="w-9 h-5 rounded-full bg-white/10 relative peer-checked:bg-sky-500 transition"><span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition peer-checked:translate-x-4"/></span>
      <span className="text-sm text-white/80">{label}</span>
    </label>
  );
}
function RangeRow({ label, value, onChange, min, max, step=1 }) {
  return <div className="text-sm"><div className="text-white/80 mb-1">{label}</div><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))} className="w-full"/></div>;
}
function NumRow({ label, value, onChange }) {
  return <div><div className="text-xs text-white/50 mb-1">{label}</div><input type="number" value={value} onChange={e=>onChange(Number(e.target.value))} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"/></div>;
}
function TimeRow({ label, value, onChange }) {
  return <div><div className="text-xs text-white/50 mb-1">{label}</div><input type="time" value={value} onChange={e=>onChange(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"/></div>;
}
function DayPicker({ value, onChange }) {
  return (
    <div className="mt-3">
      <div className="text-xs text-white/50 mb-1">Active days</div>
      <div className="flex gap-1.5 flex-wrap">
        {DAYS.map(d => (
          <button key={d} type="button" onClick={()=>onChange(value.includes(d) ? value.filter(x=>x!==d) : [...value, d])} className={`px-3 py-1 rounded-full text-xs border ${value.includes(d) ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-white/60'}`}>{d}</button>
        ))}
      </div>
    </div>
  );
}
function TestBtn({ type, onClick, disabled }) {
  return <button onClick={onClick} disabled={disabled} className="mt-3 flex items-center gap-2 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 disabled:opacity-40" data-testid={`test-${type}`}><PhoneCall className="w-3 h-3"/> Test {type} call</button>;
}
