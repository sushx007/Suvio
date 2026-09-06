'use client';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Plus, Trash2, TrendingUp, TrendingDown, Loader2, Settings2, Pencil, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { fmt } from '@/lib/currency';
import { usePreferences } from '@/components/PreferencesProvider';

const fetcher = url => fetch(url).then(r => r.json());
const CATS = ['food', 'restaurants', 'groceries', 'transport', 'shopping', 'bills', 'entertainment', 'health', 'travel', 'other'];

export default function Finance() {
  const { data, mutate } = useSWR('/api/transactions', fetcher);
  const { data: settingsData, mutate: mutateSettings } = useSWR('/api/finance/settings', fetcher);
  const { data: meData } = useSWR('/api/me', fetcher);
  const settings = settingsData?.settings || {};
  const { currency } = usePreferences();

  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingId, setEditingId] = useState(null);

  async function add(e) {
    e.preventDefault();
    if (!amount) return;
    setAdding(true);
    try {
      const r = await fetch('/api/transactions', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type, amount, category, note }) });
      if (!r.ok) throw new Error();
      setAmount(''); setNote(''); toast.success('Recorded'); mutate();
    } catch { toast.error('Failed'); } finally { setAdding(false); }
  }
  async function del(id) { await fetch(`/api/transactions/${id}`, { method:'DELETE' }); mutate(); toast.success('Deleted'); }
  async function saveTx(id, updates) { await fetch(`/api/transactions/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(updates) }); setEditingId(null); mutate(); toast.success('Updated'); }

  const items = data?.items || [];
  const spent = items.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const income = items.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const byCat = {};
  items.filter(t=>t.type==='expense').forEach(t=>{ byCat[t.category]=(byCat[t.category]||0)+t.amount; });
  const topCats = Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,5);

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Finance</h1>
          <p className="text-white/50 text-sm mt-1">Income, expenses, budget.</p>
        </div>
        <button onClick={()=>setShowSettings(s=>!s)} className="flex items-center gap-2 text-sm glass hover:bg-white/10 rounded-lg px-3 py-2 transition">
          <Settings2 className="w-4 h-4"/> {showSettings?'Hide':'Edit'} settings
        </button>
      </div>

      {showSettings && <FinanceSettings settings={settings} onSave={async (s)=>{ await fetch('/api/finance/settings', {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(s)}); toast.success('Settings saved'); mutateSettings(); }} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <StatBox label="Annual income" value={fmt(settings.annualIncome, currency)} tint="text-emerald-300"/>
        <StatBox label="Monthly budget" value={fmt(settings.monthlyBudget, currency)} tint="text-sky-300"/>
        <StatBox label="Spent this month" value={fmt(spent, currency)} tint="text-rose-300"/>
        <StatBox label="Savings goal" value={fmt(settings.savingsGoal, currency)} tint="text-purple-300"/>
      </div>

      {settings.monthlyBudget > 0 && (
        <div className="mt-4 glass rounded-2xl p-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/70">Budget usage</span>
            <span className="font-medium">{((spent/settings.monthlyBudget)*100).toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div className={`h-full ${spent>settings.monthlyBudget?'bg-rose-500':'bg-gradient-to-r from-sky-400 to-emerald-400'}`} style={{width: `${Math.min((spent/settings.monthlyBudget)*100,100)}%`}} />
          </div>
        </div>
      )}

      <form onSubmit={add} className="mt-6 glass-strong rounded-2xl p-4 flex flex-wrap gap-2">
        <select value={type} onChange={e=>setType(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
          <option value="expense">Expense</option><option value="income">Income</option>
        </select>
        <input type="number" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Amount" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm w-32" />
        <select value={category} onChange={e=>setCategory(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">{CATS.map(c=><option key={c}>{c}</option>)}</select>
        <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Note (optional)" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]" />
        <button disabled={adding} className="bg-white text-black rounded-lg px-4 py-2 text-sm font-medium hover:bg-white/90 disabled:opacity-50 flex items-center gap-1">
          {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Plus className="w-3.5 h-3.5"/>} Add
        </button>
      </form>

      {topCats.length>0 && (
        <div className="mt-6 glass rounded-2xl p-5">
          <div className="text-sm text-white/70 mb-4">Top categories</div>
          <div className="space-y-3">
            {topCats.map(([cat, amt]) => (
              <div key={cat}>
                <div className="flex justify-between text-sm mb-1"><span className="text-white/70 capitalize">{cat}</span><span className="text-white/90 font-medium">{fmt(amt, currency)}</span></div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden"><div className="h-full bg-gradient-to-r from-sky-400 to-purple-400" style={{width: `${(amt/spent)*100}%`}} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 glass rounded-2xl divide-y divide-white/5">
        {items.length===0 && <div className="p-8 text-center text-white/40 text-sm">No transactions yet.</div>}
        {items.slice(0, 50).map(t => (
          <TxRow key={t.id} t={t} currency={currency} editing={editingId===t.id} onEdit={()=>setEditingId(t.id)} onCancel={()=>setEditingId(null)} onSave={(u)=>saveTx(t.id,u)} onDelete={()=>del(t.id)} />
        ))}
      </div>
    </div>
  );
}

function StatBox({ label, value, tint }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-xs text-white/50">{label}</div>
      <div className={`text-2xl font-semibold mt-2 ${tint||''}`}>{value}</div>
    </div>
  );
}

function FinanceSettings({ settings, onSave }) {
  const [income, setIncome] = useState(settings.annualIncome || '');
  const [budget, setBudget] = useState(settings.monthlyBudget || '');
  const [savings, setSavings] = useState(settings.savingsGoal || '');
  const [currency, setCurrency] = useState(settings.currency || 'INR');
  const CURR = { INR:'₹ INR — Indian Rupee', USD:'$ USD — US Dollar', EUR:'€ EUR — Euro', GBP:'£ GBP — British Pound', AUD:'A$ AUD — Australian Dollar', CAD:'C$ CAD — Canadian Dollar', AED:'د.إ AED — UAE Dirham', SGD:'S$ SGD — Singapore Dollar' };
  return (
    <div className="mt-6 glass-strong rounded-2xl p-6">
      <div className="text-sm font-medium mb-4">Finance settings</div>
      <div className="grid md:grid-cols-4 gap-3">
        <Field label="Annual income" value={income} onChange={setIncome} type="number" />
        <Field label="Monthly budget" value={budget} onChange={setBudget} type="number" />
        <Field label="Savings goal" value={savings} onChange={setSavings} type="number" />
        <div>
          <div className="text-xs text-white/50 mb-1">Currency</div>
          <select value={currency} onChange={e=>setCurrency(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400/60">
            {Object.entries(CURR).map(([c,l]) => <option key={c} value={c}>{l}</option>)}
          </select>
        </div>
      </div>
      <button onClick={()=>onSave({ annualIncome:Number(income)||0, monthlyBudget:Number(budget)||0, savingsGoal:Number(savings)||0, currency })} className="mt-4 bg-white text-black rounded-lg px-4 py-2 text-sm font-medium hover:bg-white/90 flex items-center gap-2">
        <Save className="w-3.5 h-3.5"/> Save
      </button>
    </div>
  );
}

function Field({ label, value, onChange, type='text' }) {
  return (
    <div>
      <div className="text-xs text-white/50 mb-1">{label}</div>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400/60" />
    </div>
  );
}

function TxRow({ t, currency, editing, onEdit, onCancel, onSave, onDelete }) {
  const [amt, setAmt] = useState(t.amount);
  const [cat, setCat] = useState(t.category);
  const [note, setNote] = useState(t.note || '');
  useEffect(()=>{ setAmt(t.amount); setCat(t.category); setNote(t.note||''); }, [t]);
  if (editing) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-white/5">
        <input type="number" value={amt} onChange={e=>setAmt(e.target.value)} className="w-24 bg-white/5 border border-white/10 rounded px-2 py-1 text-sm" />
        <select value={cat} onChange={e=>setCat(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm">{CATS.map(c=><option key={c}>{c}</option>)}</select>
        <input value={note} onChange={e=>setNote(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-sm" />
        <button onClick={()=>onSave({ amount:Number(amt), category:cat, note })} className="text-emerald-400 hover:text-emerald-300"><Save className="w-4 h-4"/></button>
        <button onClick={onCancel} className="text-white/40 hover:text-white"><X className="w-4 h-4"/></button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 px-4 py-3 group">
      <div className={`w-8 h-8 rounded-lg grid place-items-center ${t.type==='income'?'bg-emerald-500/10 text-emerald-400':'bg-rose-500/10 text-rose-400'}`}>{t.type==='income'?'+':'−'}</div>
      <div className="flex-1">
        <div className="text-sm font-medium">{t.note || t.category}</div>
        <div className="text-xs text-white/40 capitalize">{t.category} · {new Date(t.date).toLocaleDateString()}</div>
      </div>
      <div className={`text-sm font-semibold ${t.type==='income'?'text-emerald-400':''}`}>{fmt(t.amount, currency)}</div>
      <button onClick={onEdit} className="text-white/30 hover:text-sky-400 opacity-0 group-hover:opacity-100 transition"><Pencil className="w-3.5 h-3.5"/></button>
      <button onClick={onDelete} className="text-white/30 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition"><Trash2 className="w-3.5 h-3.5"/></button>
    </div>
  );
}

