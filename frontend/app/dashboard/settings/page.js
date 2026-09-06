// AI Memory panel is defined below.

'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, DollarSign, Heart, Shirt, Plane, LogOut, Save, Trash2, Shield, Palette, XCircle, Crown, Check, Globe, Languages, Brain } from 'lucide-react';
import { toast } from 'sonner';
import { usePreferences } from '@/components/PreferencesProvider';
import { THEMES } from '@/lib/themes';
import { CURRENCIES, SUPPORTED_LANGUAGES, DATE_FORMATS } from '@/lib/preferences';
import AccentColorPicker from '@/components/AccentColorPicker';

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'preferences', label: 'Preferences', icon: Globe },
  { id: 'ai-memory', label: 'AI Memory', icon: Brain },
  { id: 'plan', label: 'Plan & Billing', icon: Crown },
  { id: 'finance', label: 'Finance', icon: DollarSign },
  { id: 'health', label: 'Health', icon: Heart },
  { id: 'wardrobe', label: 'Wardrobe', icon: Shirt },
  { id: 'travel', label: 'Travel', icon: Plane },
  { id: 'privacy', label: 'Privacy & Data', icon: Shield },
];

export default function Settings() {
  const [active, setActive] = useState('appearance');
  const [user, setUser] = useState(null);
  const [modules, setModules] = useState({ finance: {}, health: {}, wardrobe: {}, travel: {} });

  useEffect(() => {
    fetch('/api/me').then(r=>r.json()).then(d=>setUser(d.user));
    ['finance','health','wardrobe','travel'].forEach(m => {
      fetch(`/api/${m}/settings`).then(r=>r.json()).then(d => setModules(prev => ({ ...prev, [m]: d.settings || {} })));
    });
  }, []);

  const router = useRouter();
  async function logout() { await fetch('/api/auth/logout', {method:'POST'}); router.push('/'); }

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      <p className="text-white/50 text-sm mt-1">Manage your Suvio operating system.</p>

      <div className="mt-8 grid md:grid-cols-[220px_1fr] gap-6">
        <div className="glass rounded-2xl p-2 h-fit">
          {SECTIONS.map(s => (
            <button key={s.id} onClick={()=>setActive(s.id)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${active===s.id?'bg-white/10 text-white':'text-white/60 hover:bg-white/5'}`}>
              <s.icon className="w-4 h-4"/>{s.label}
            </button>
          ))}
          <button onClick={logout} className="w-full mt-2 flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-rose-400 hover:bg-rose-500/10 transition">
            <LogOut className="w-4 h-4"/>Sign out
          </button>
        </div>

        <div className="glass rounded-2xl p-6">
          {active==='profile' && <ProfilePanel user={user} onUpdate={setUser} />}
          {active==='appearance' && <AppearancePanel />}
          {active==='preferences' && <GlobalPrefsPanel />}
          {active==='ai-memory' && <AIMemoryPanel />}
          {active==='plan' && <PlanPanel user={user} onUpdate={setUser} />}
          {active==='finance' && <ModulePanel module="finance" data={modules.finance} fields={FIN_FIELDS} onSave={(d)=>saveModule('finance', d, setModules)} />}
          {active==='health' && <ModulePanel module="health" data={modules.health} fields={HEALTH_FIELDS} onSave={(d)=>saveModule('health', d, setModules)} />}
          {active==='wardrobe' && <ModulePanel module="wardrobe" data={modules.wardrobe} fields={WARD_FIELDS} onSave={(d)=>saveModule('wardrobe', d, setModules)} />}
          {active==='travel' && <ModulePanel module="travel" data={modules.travel} fields={TRAVEL_FIELDS} onSave={(d)=>saveModule('travel', d, setModules)} />}
          {active==='privacy' && <PrivacyPanel />}
        </div>
      </div>
    </div>
  );
}

async function saveModule(name, data, setModules) {
  const numeric = ['annualIncome','monthlyBudget','savingsGoal','height','weight','waterGoal','sleepGoal','stepGoal','clothingBudget'];
  const body = { ...data };
  numeric.forEach(k => { if (k in body) body[k] = Number(body[k])||0; });
  await fetch(`/api/${name}/settings`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  setModules(prev => ({ ...prev, [name]: body }));
  toast.success('Saved');
}

const FIN_FIELDS = [
  { key: 'annualIncome', label: 'Annual income', type:'number' },
  { key: 'monthlyBudget', label: 'Monthly budget', type:'number' },
  { key: 'savingsGoal', label: 'Savings goal', type:'number' },
];
const HEALTH_FIELDS = [
  { key: 'height', label: 'Height (cm)', type:'number' },
  { key: 'weight', label: 'Weight (kg)', type:'number' },
  { key: 'dob', label: 'Date of birth', type:'date' },
  { key: 'gender', label: 'Gender', type:'select', options:['male','female','other'] },
  { key: 'waterGoal', label: 'Water goal (ml)', type:'number' },
  { key: 'sleepGoal', label: 'Sleep goal (hrs)', type:'number' },
  { key: 'stepGoal', label: 'Step goal', type:'number' },
];
const WARD_FIELDS = [
  { key:'topSize', label:'Top size' },{ key:'bottomSize', label:'Bottom size' },{ key:'shoeSize', label:'Shoe size' },{ key:'favColor', label:'Favorite color' },{ key:'clothingBudget', label:'Clothing budget', type:'number' },
];
const TRAVEL_FIELDS = [
  { key:'homeAirport', label:'Home airport' },{ key:'airline', label:'Preferred airline' },{ key:'hotel', label:'Hotel preference' },
];

function ModulePanel({ module, data, fields, onSave }) {
  const [state, setState] = useState({});
  useEffect(() => { setState(data || {}); }, [data]);
  return (
    <div>
      <div className="text-lg font-semibold mb-1 capitalize">{module} settings</div>
      <p className="text-sm text-white/50 mb-6">Everything here is used by Suvio AI to personalise insights.</p>
      <div className="grid md:grid-cols-2 gap-4">
        {fields.map(f => (
          <div key={f.key}>
            <div className="text-xs text-white/50 mb-1">{f.label}</div>
            {f.type==='select' ? (
              <select value={state[f.key]||''} onChange={e=>setState(s=>({...s,[f.key]:e.target.value}))} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm">
                {f.options.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input type={f.type||'text'} value={state[f.key]||''} onChange={e=>setState(s=>({...s,[f.key]:e.target.value}))} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-white/40"/>
            )}
          </div>
        ))}
      </div>
      <button onClick={()=>onSave(state)} className="mt-6 accent-bg text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 flex items-center gap-2 transition">
        <Save className="w-3.5 h-3.5"/> Save changes
      </button>
    </div>
  );
}

function ProfilePanel({ user, onUpdate }) {
  const { currency, setPreference } = usePreferences();
  const [name, setName] = useState(user?.name || '');
  useEffect(() => { setName(user?.name || ''); }, [user]);
  async function save() {
    const r = await fetch('/api/profile', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, currency }) });
    const d = await r.json();
    onUpdate(d.user);
    toast.success('Profile updated');
  }
  return (
    <div>
      <div className="text-lg font-semibold">Profile</div>
      <p className="text-sm text-white/50 mt-1">Your basic account info.</p>
      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <div><div className="text-xs text-white/50 mb-1">Name</div><input value={name} onChange={e=>setName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"/></div>
        <div><div className="text-xs text-white/50 mb-1">Email</div><input value={user?.email||''} disabled className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/60"/></div>
        <div>
          <div className="text-xs text-white/50 mb-1">Default currency <span className="text-[10px] text-white/40">(also settable in Preferences)</span></div>
          <select value={currency} onChange={e=>setPreference('currency', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm">
            {Object.entries(CURRENCIES).map(([code, meta]) => <option key={code} value={code}>{meta.symbol} {code} — {meta.name}</option>)}
          </select>
        </div>
        {user?.plan && (
          <div>
            <div className="text-xs text-white/50 mb-1">Plan</div>
            <div className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm capitalize flex items-center justify-between">
              <span>{user.planStatus === 'pro' ? `⭐ Suvio ${(user.planTier || 'Pro').charAt(0).toUpperCase() + (user.planTier || 'pro').slice(1)}` : '🌱 Free plan'}</span>
              {user.planStatus !== 'pro' && <a href="/dashboard/upgrade" className="text-xs accent-text hover:underline">Upgrade</a>}
            </div>
          </div>
        )}
      </div>
      <button onClick={save} className="mt-6 accent-bg text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 flex items-center gap-2 transition">
        <Save className="w-3.5 h-3.5"/> Save
      </button>
    </div>
  );
}

function PrivacyPanel() {
  return (
    <div>
      <div className="text-lg font-semibold">Privacy & Data</div>
      <p className="text-sm text-white/50 mt-1">Your data is private. Suvio AI only uses it to help you.</p>
      <div className="mt-6 space-y-3">
        <div className="glass rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">AI Memory</div>
            <div className="text-xs text-white/50">Suvio AI remembers your recent tasks, transactions, notes and health logs to give better advice.</div>
          </div>
          <div className="text-xs text-emerald-400">Enabled</div>
        </div>
        <div className="glass rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Export data</div>
            <div className="text-xs text-white/50">Download everything you've tracked.</div>
          </div>
          <button onClick={()=>toast('Coming soon')} className="text-xs px-3 py-1.5 rounded-lg glass hover:bg-white/10">Export</button>
        </div>
        <div className="glass rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-rose-400">Delete account</div>
            <div className="text-xs text-white/50">Permanently erase your Suvio account.</div>
          </div>
          <button onClick={()=>toast('Contact support to delete your account.')} className="text-xs px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 flex items-center gap-1"><Trash2 className="w-3 h-3"/>Delete</button>
        </div>
      </div>
    </div>
  );
}

function AppearancePanel() {
  const { theme, accentColor, setPreference } = usePreferences();
  return (
    <div>
      <div className="text-lg font-semibold">Appearance</div>
      <p className="text-sm text-white/50 mt-1">Choose your theme and accent — the entire Suvio interface updates instantly.</p>

      <div className="mt-6">
        <div className="text-xs uppercase tracking-wider text-white/50 mb-3">Theme</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.values(THEMES).map(t => {
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setPreference('theme', t.id); toast.success(`Theme: ${t.name}`); }}
                className={`text-left rounded-2xl p-4 transition-all relative overflow-hidden border ${active ? 'border-transparent ring-2 accent-ring' : 'border-[var(--suvio-border)] hover:border-[var(--suvio-border-strong)]'}`}
                style={{ background: t.tokens['--suvio-surface-strong'] }}
              >
                <div className="flex gap-1.5 mb-3">
                  {t.swatch.map((c, i) => (
                    <span key={i} className="w-6 h-6 rounded-md shadow-inner" style={{ background: c }}/>
                  ))}
                </div>
                <div className="text-sm font-medium flex items-center gap-2" style={{ color: t.tokens['--suvio-text'] }}>
                  {t.name}
                  {active && <Check className="w-3.5 h-3.5 accent-text"/>}
                </div>
                <div className="text-[11px] mt-1 line-clamp-2" style={{ color: t.tokens['--suvio-text-muted'] }}>{t.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8">
        <div className="text-xs uppercase tracking-wider text-white/50 mb-3">Accent color</div>
        <div className="glass rounded-2xl p-5">
          <AccentColorPicker value={accentColor} onChange={(c) => setPreference('accentColor', c)} />
          <div className="mt-6 grid grid-cols-3 gap-3">
            <button type="button" className="p-3 rounded-lg accent-bg text-xs text-center font-medium hover:opacity-90 transition">Primary button</button>
            <button type="button" className="p-3 rounded-lg accent-border accent-text text-xs text-center font-medium hover:accent-bg-soft transition">Outline</button>
            <button type="button" className="p-3 rounded-lg accent-bg-soft text-xs text-center font-medium accent-pulse">Highlight</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GlobalPrefsPanel() {
  const { prefs, setPreference } = usePreferences();
  const tzList = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney', 'UTC'];
  return (
    <div>
      <div className="text-lg font-semibold">Global preferences</div>
      <p className="text-sm text-white/50 mt-1">Currency, language, timezone & date format. Applies across every page instantly.</p>

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <Field label="Currency" hint="Every money value re-formats instantly.">
          <select value={prefs.currency} onChange={e=>setPreference('currency', e.target.value)} className="input">
            {Object.entries(CURRENCIES).map(([code, meta]) => <option key={code} value={code}>{meta.symbol} {code} — {meta.name}</option>)}
          </select>
        </Field>
        <Field label="Language" hint="AI responses & UI hints.">
          <select value={prefs.language} onChange={e=>setPreference('language', e.target.value)} className="input">
            {SUPPORTED_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </Field>
        <Field label="Timezone">
          <select value={prefs.timezone} onChange={e=>setPreference('timezone', e.target.value)} className="input">
            {tzList.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </Field>
        <Field label="Date format">
          <select value={prefs.dateFormat} onChange={e=>setPreference('dateFormat', e.target.value)} className="input">
            {DATE_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </Field>
      </div>

      <style jsx>{`
        .input { width: 100%; background: var(--suvio-input-bg); border: 1px solid var(--suvio-border-strong); border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; color: var(--suvio-text); outline: none; }
        .input:focus { border-color: var(--accent-hex); }
      `}</style>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="text-xs text-white/60 mb-1 flex items-center gap-2"><Languages className="w-3 h-3 opacity-40"/>{label}</div>
      {children}
      {hint && <div className="text-[11px] text-white/40 mt-1">{hint}</div>}
    </div>
  );
}

function PlanPanel({ user, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [estimate, setEstimate] = useState(null);
  const [history, setHistory] = useState([]);
  const status = user?.planStatus;
  const isPro = status === 'pro';
  const isLifetime = false; // V1.1: lifetime removed
  const isPremium = user?.planTier === 'premium';
  const isCancelled = !!user?.cancelledAt;
  const expires = user?.planExpiresAt ? new Date(user.planExpiresAt).toLocaleDateString() : null;

  useEffect(() => {
    fetch('/api/billing/history').then(r=>r.json()).then(d => setHistory(d.items || []));
  }, [user?.id]);

  async function openRefundModal() {
    setLoading(true);
    try {
      const r = await fetch('/api/subscribe/refund-estimate');
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setEstimate(d);
      setShowRefund(true);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }
  async function confirmRefund() {
    setLoading(true);
    try {
      const r = await fetch('/api/subscribe/cancel-with-refund', { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success(`Plan cancelled. Refund of ${d.refundAmount.toFixed(2)} ${d.currency} processed.`);
      setShowRefund(false);
      const m = await fetch('/api/me').then(x=>x.json());
      onUpdate(m.user);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }

  return (
    <div>
      <div className="text-lg font-semibold">Plan & Billing</div>
      <p className="text-sm text-white/50 mt-1">Manage your Suvio subscription.</p>

      <div className="mt-6 glass rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <Crown className={`w-5 h-5 ${isPro?'accent-text':'text-white/40'}`}/>
              <div className="text-lg font-semibold">
                {isPro ? `Suvio ${(user?.planTier || 'Pro').charAt(0).toUpperCase() + (user?.planTier || 'pro').slice(1)}${user?.planSku ? ' (' + user.planSku.replace('_', ' ') + ')' : ''}` : 'Free Forever plan'}
              </div>
            </div>
            {isPro && (
              <div className="text-sm text-white/60 mt-2">
                {isCancelled ? <>Cancelled. Access ends <span className="accent-text">{expires}</span>.</> : <>Renews on <span className="text-white/90">{expires}</span></>}
              </div>
            )}
            {isPremium && <div className="text-sm text-emerald-400 mt-2">Premium — the complete Suvio experience 🎉</div>}
            {!isPro && <div className="text-sm text-white/60 mt-2">Upgrade to unlock unlimited AI + all modules forever.</div>}
          </div>
          <div className="flex flex-col gap-2">
            {!isPro && <a href="/dashboard/upgrade" className="accent-bg rounded-lg px-4 py-2 text-sm font-semibold text-center hover:opacity-90 transition">Upgrade Suvio</a>}
            {isPro && !isCancelled && (
              <button disabled={loading} onClick={openRefundModal} className="bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                {loading ? <Loader2Icon /> : <XCircle className="w-4 h-4"/>} Cancel & get refund
              </button>
            )}
            {isPro && <a href="/dashboard/upgrade" className="text-xs text-white/50 hover:text-white text-center">Change plan</a>}
          </div>
        </div>
      </div>

      {/* Billing history */}
      <div className="mt-6">
        <div className="text-sm font-medium mb-3">Billing history</div>
        {history.length === 0 ? (
          <div className="glass rounded-xl p-6 text-sm text-white/40 text-center">No payments yet.</div>
        ) : (
          <div className="glass rounded-xl divide-y divide-white/5">
            {history.map(h => (
              <div key={h.id} className="flex items-center gap-4 p-4 text-sm">
                <div className={`w-2 h-2 rounded-full ${h.status==='paid'?'bg-emerald-400':h.status==='refunded'?'bg-amber-400':h.status==='failed'?'bg-rose-400':'bg-white/30'}`}/>
                <div>
                  <div className="font-medium capitalize">{h.planId} plan</div>
                  <div className="text-xs text-white/40">{new Date(h.createdAt).toLocaleString()} · {h.orderId?.slice(0,20)}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="font-semibold">{h.currency} {Number(h.amount).toFixed(2)}</div>
                  <div className="text-xs capitalize" style={{ color: h.status==='paid'?'#10b981':h.status==='refunded'?'#f59e0b':'#f43f5e' }}>{h.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Refund estimator modal */}
      {showRefund && estimate && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={()=>setShowRefund(false)}>
          <div className="glass-strong rounded-2xl p-6 max-w-md w-full" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-5 h-5 text-rose-400"/>
              <div className="text-lg font-semibold">Cancel Suvio Pro</div>
            </div>
            <p className="text-sm text-white/60">Here's an honest, prorated refund based on how much of your plan is unused.</p>

            <div className="mt-4 space-y-2 text-sm">
              <Row label="Paid" value={`${estimate.payment.currency} ${estimate.payment.amount.toFixed(2)}`} />
              <Row label={`Days used (${estimate.usedDays} / ${estimate.totalDays})`} value={`${(estimate.usedDays/estimate.totalDays*100).toFixed(0)}%`} />
              <Row label="Days remaining" value={estimate.remainingDays} />
              <Row label="Daily rate" value={`${estimate.payment.currency} ${estimate.dailyRate.toFixed(2)}`} />
              <Row label="Base refund" value={`${estimate.payment.currency} ${estimate.baseRefund.toFixed(2)}`} />
              <Row label={`Usage adjustment (${estimate.usagePenaltyPct}%)`} value={`− ${estimate.payment.currency} ${estimate.usagePenalty.toFixed(2)}`} muted />
              <div className="border-t border-white/10 pt-3 mt-2">
                <Row label={<span className="font-semibold">Estimated refund</span>} value={<span className="text-lg accent-text font-bold">{estimate.payment.currency} {estimate.finalRefund.toFixed(2)}</span>} />
              </div>
            </div>

            <p className="mt-4 text-xs text-white/40">Refund is initiated instantly via Razorpay and typically credits back to your original payment method within 5-7 business days.</p>

            <div className="mt-6 flex gap-2">
              <button onClick={()=>setShowRefund(false)} className="flex-1 glass hover:bg-white/10 rounded-lg py-2.5 text-sm font-medium">Keep my plan</button>
              <button disabled={loading} onClick={confirmRefund} className="flex-1 bg-rose-500 hover:bg-rose-600 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <Loader2Icon/>} Confirm & refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, muted }) {
  return (
    <div className={`flex justify-between ${muted ? 'text-white/40' : ''}`}>
      <span>{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Loader2Icon() {
  return <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="30 30" strokeLinecap="round"/></svg>;
}

function AIMemoryPanel() {
  const [items, setItems] = useState([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState('');
  const [newCat, setNewCat] = useState('general');

  useEffect(() => {
    fetch('/api/ai/memory').then(r=>r.json()).then(d => { setItems(d.items || []); setEnabled(d.enabled !== false); setLoading(false); });
  }, []);

  async function toggle() {
    const next = !enabled;
    setEnabled(next);
    await fetch('/api/ai/memory', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ enabled: next }) });
    toast.success(`AI Memory ${next ? 'enabled' : 'disabled'}`);
  }
  async function add(e) {
    e?.preventDefault?.();
    if (!newContent.trim()) return;
    const r = await fetch('/api/ai/memory', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ content: newContent, category: newCat }) });
    const d = await r.json();
    setItems([d.item, ...items]);
    setNewContent(''); toast.success('Memory added');
  }
  async function del(id) {
    await fetch(`/api/ai/memory/${id}`, { method:'DELETE' });
    setItems(items.filter(m => m.id !== id));
  }
  async function clearAll() {
    if (!confirm('Delete ALL memories? This cannot be undone.')) return;
    await fetch('/api/ai/memory', { method:'DELETE' });
    setItems([]); toast.success('All memories cleared');
  }
  async function updateItem(id, content) {
    await fetch(`/api/ai/memory/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ content }) });
    setItems(items.map(m => m.id === id ? { ...m, content } : m));
  }

  const CATEGORIES = ['general','goals','finance','travel','productivity','health','wardrobe'];

  return (
    <div>
      <div className="text-lg font-semibold flex items-center gap-2"><Brain className="w-5 h-5 accent-text"/> AI Memory</div>
      <p className="text-sm text-white/50 mt-1">Facts Suvio AI remembers to personalize its help. Fully under your control.</p>

      <div className="mt-6 glass rounded-xl p-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Enable AI Memory</div>
          <div className="text-xs text-white/50">When off, Suvio AI will not use any memory for its answers.</div>
        </div>
        <button onClick={toggle} className={`relative w-11 h-6 rounded-full transition ${enabled ? 'accent-bg' : 'bg-white/10'}`}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${enabled ? 'left-[22px]' : 'left-0.5'}`}/>
        </button>
      </div>

      <form onSubmit={add} className="mt-6 glass-strong rounded-2xl p-4">
        <div className="text-sm font-medium mb-3">Add a memory</div>
        <div className="grid md:grid-cols-[1fr_140px_auto] gap-2">
          <input value={newContent} onChange={e=>setNewContent(e.target.value)} placeholder="e.g. I'm vegetarian, I hate crowded flights, I save 30% of salary" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:accent-border"/>
          <select value={newCat} onChange={e=>setNewCat(e.target.value)} className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="accent-bg text-white rounded-lg px-4 py-2 text-sm font-medium">Save memory</button>
        </div>
      </form>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm font-medium">Your memories ({items.length})</div>
        {items.length > 0 && <button onClick={clearAll} className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"><Trash2 className="w-3 h-3"/>Clear all</button>}
      </div>

      {loading ? (
        <div className="mt-3 space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-white/5 shimmer"/>)}</div>
      ) : items.length === 0 ? (
        <div className="mt-3 glass rounded-xl p-8 text-center text-sm text-white/40">No memories yet. Add facts about yourself to help Suvio personalize.</div>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map(m => <MemoryItem key={m.id} item={m} onDelete={()=>del(m.id)} onEdit={(c)=>updateItem(m.id, c)}/>)}
        </div>
      )}
    </div>
  );
}

function MemoryItem({ item, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(item.content);
  return (
    <div className="glass rounded-xl p-4 flex items-start gap-3 group">
      <div className="w-8 h-8 rounded-lg accent-bg/20 grid place-items-center text-xs uppercase" style={{ background: 'rgba(var(--accent-rgb), 0.15)' }}>
        <span className="accent-text">{item.category?.[0] || 'M'}</span>
      </div>
      <div className="flex-1 min-w-0">
        {editing ? (
          <textarea value={content} onChange={e=>setContent(e.target.value)} rows={2} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:accent-border resize-none"/>
        ) : (
          <div className="text-sm">{item.content}</div>
        )}
        <div className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">{item.category} · {new Date(item.createdAt).toLocaleDateString()}</div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
        {editing ? (
          <>
            <button onClick={()=>{ onEdit(content); setEditing(false); }} className="text-emerald-400 text-xs">Save</button>
            <button onClick={()=>{ setContent(item.content); setEditing(false); }} className="text-white/40 text-xs">Cancel</button>
          </>
        ) : (
          <>
            <button onClick={()=>setEditing(true)} className="text-white/40 hover:accent-text text-xs">Edit</button>
            <button onClick={onDelete} className="text-white/40 hover:text-rose-400 text-xs"><Trash2 className="w-3.5 h-3.5"/></button>
          </>
        )}
      </div>
    </div>
  );
}

