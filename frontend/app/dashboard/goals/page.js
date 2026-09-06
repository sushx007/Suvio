'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { Plus, Target, Trash2, Check, Trophy, Flame, TrendingUp, Calendar, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { usePreferences } from '@/components/PreferencesProvider';

const fetcher = url => fetch(url).then(r => r.json());
const CATEGORIES = [
  { id: 'finance', label: 'Finance', color: '#10b981' },
  { id: 'fitness', label: 'Fitness', color: '#f43f5e' },
  { id: 'learning', label: 'Learning', color: '#8b5cf6' },
  { id: 'travel', label: 'Travel', color: '#0ea5e9' },
  { id: 'reading', label: 'Reading', color: '#f59e0b' },
  { id: 'habit', label: 'Habit', color: '#22c55e' },
  { id: 'personal', label: 'Personal', color: '#a1a1aa' },
];

export default function Goals() {
  const { data, mutate } = useSWR('/api/goals', fetcher);
  const items = data?.items || [];
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? items : items.filter(g => g.category === filter);
  const completed = items.filter(g => g.completedAt).length;
  const active = items.filter(g => !g.completedAt).length;
  const avgProgress = items.length ? Math.round(items.reduce((s,g)=>s + Math.min(1,(g.current||0)/(g.target||1)),0)/items.length*100) : 0;

  async function add(payload) {
    await fetch('/api/goals', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    setShowForm(false); toast.success('Goal created'); mutate();
  }
  async function update(id, updates) {
    await fetch(`/api/goals/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(updates) });
    mutate();
  }
  async function remove(id) {
    await fetch(`/api/goals/${id}`, { method:'DELETE' }); toast.success('Goal deleted'); mutate();
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
            <Target className="w-7 h-7 accent-text"/> Goals
          </h1>
          <p className="text-white/50 text-sm mt-1">Turn ambitions into progress. Track anything.</p>
        </div>
        <button onClick={()=>setShowForm(s=>!s)} className="flex items-center gap-2 text-sm accent-bg text-white hover:opacity-90 rounded-lg px-3 py-2 font-medium transition">
          <Plus className="w-4 h-4"/> New goal
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={Target} label="Active" value={active} tint="accent-text"/>
        <Stat icon={Trophy} label="Completed" value={completed} tint="text-emerald-400"/>
        <Stat icon={TrendingUp} label="Avg progress" value={`${avgProgress}%`} tint="text-sky-400"/>
        <Stat icon={Flame} label="Longest streak" value={items.reduce((m,g)=>Math.max(m,g.streak||0),0)} tint="text-orange-400"/>
      </div>

      {showForm && <GoalForm onSubmit={add} onCancel={()=>setShowForm(false)} />}

      <div className="mt-6 flex gap-1 flex-wrap">
        <FilterChip active={filter==='all'} onClick={()=>setFilter('all')}>All</FilterChip>
        {CATEGORIES.map(c => (
          <FilterChip key={c.id} active={filter===c.id} onClick={()=>setFilter(c.id)} color={c.color}>{c.label}</FilterChip>
        ))}
      </div>

      <div className="mt-4 grid md:grid-cols-2 gap-3">
        {filtered.length === 0 && (
          <div className="md:col-span-2 glass rounded-2xl p-12 text-center">
            <Target className="w-8 h-8 mx-auto accent-text mb-3"/>
            <div className="text-lg font-medium">No goals yet</div>
            <div className="text-sm text-white/50 mt-1">Set your first goal to unlock personalized AI insights.</div>
          </div>
        )}
        {filtered.map(g => <GoalCard key={g.id} goal={g} onUpdate={(u)=>update(g.id,u)} onDelete={()=>remove(g.id)} />)}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, color, children }) {
  return (
    <button onClick={onClick} className={`text-xs px-3 py-1.5 rounded-lg transition ${active ? 'accent-bg text-white' : 'glass hover:bg-white/10 text-white/70'}`}>
      {color && <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: color }}/>}
      {children}
    </button>
  );
}

function Stat({ icon: Icon, label, value, tint }) {
  return (
    <div className="glass rounded-2xl p-5">
      <Icon className={`w-4 h-4 ${tint} mb-3`}/>
      <div className="text-xs text-white/50">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function GoalCard({ goal, onUpdate, onDelete }) {
  const { format } = usePreferences();
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState(goal.current || 0);
  const progress = Math.min(1, (goal.current || 0) / (goal.target || 1));
  const cat = CATEGORIES.find(c => c.id === goal.category) || CATEGORIES[6];
  const done = !!goal.completedAt;
  const isMoney = goal.category === 'finance' && goal.unit === 'money';

  return (
    <div className={`glass rounded-2xl p-5 relative group transition-all ${done ? 'ring-1 ring-emerald-500/40' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg grid place-items-center text-lg" style={{ background: cat.color + '22', color: cat.color }}>
          {done ? <Trophy className="w-5 h-5"/> : <Target className="w-5 h-5"/>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-base font-semibold truncate">{goal.title}</div>
            {done && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">DONE</span>}
          </div>
          <div className="text-xs text-white/50 capitalize mt-0.5">{cat.label}{goal.deadline && ` · due ${new Date(goal.deadline).toLocaleDateString()}`}</div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button onClick={()=>setEditing(!editing)} className="text-white/40 hover:accent-text"><Pencil className="w-3.5 h-3.5"/></button>
          <button onClick={onDelete} className="text-white/40 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5"/></button>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between mb-1.5">
          <div className="text-sm text-white/70">
            <span className="text-white font-semibold">{isMoney ? format(goal.current||0) : (goal.current||0)}</span>
            <span className="text-white/40"> / {isMoney ? format(goal.target||0) : (goal.target||0)}{goal.unit && !isMoney ? ` ${goal.unit}` : ''}</span>
          </div>
          <div className="text-xs font-medium accent-text">{Math.round(progress*100)}%</div>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full transition-all duration-500 rounded-full" style={{ width: `${progress*100}%`, background: done ? '#10b981' : `linear-gradient(90deg, ${cat.color}, var(--accent-hex))` }}/>
        </div>
      </div>

      {editing && (
        <div className="mt-4 flex gap-2">
          <input type="number" value={current} onChange={e=>setCurrent(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:accent-border"/>
          <button onClick={()=>{ onUpdate({ current: Number(current)||0 }); setEditing(false); toast.success('Progress updated'); }} className="accent-bg text-white rounded-lg px-3 py-1.5 text-sm font-medium">Save</button>
          <button onClick={()=>setEditing(false)} className="glass rounded-lg px-3 py-1.5 text-sm">Cancel</button>
        </div>
      )}
      {!editing && !done && (
        <div className="mt-3 flex gap-2">
          <button onClick={()=>onUpdate({ current: (goal.current||0) + 1 })} className="text-xs glass hover:bg-white/10 rounded-lg px-3 py-1.5 flex items-center gap-1"><Plus className="w-3 h-3"/>+1</button>
          <button onClick={()=>setEditing(true)} className="text-xs glass hover:bg-white/10 rounded-lg px-3 py-1.5">Set value</button>
          <button onClick={()=>onUpdate({ current: goal.target })} className="text-xs glass hover:bg-white/10 rounded-lg px-3 py-1.5 flex items-center gap-1 ml-auto"><Check className="w-3 h-3"/>Complete</button>
        </div>
      )}
    </div>
  );
}

function GoalForm({ onSubmit, onCancel }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('personal');
  const [target, setTarget] = useState(100);
  const [unit, setUnit] = useState('');
  const [deadline, setDeadline] = useState('');

  return (
    <form onSubmit={e=>{ e.preventDefault(); if (!title) return; onSubmit({ title, category, target: Number(target), unit, deadline }); }} className="mt-6 glass-strong rounded-2xl p-6">
      <div className="text-sm font-semibold mb-4">New goal</div>
      <div className="grid md:grid-cols-2 gap-3">
        <Input label="Title" value={title} onChange={setTitle} placeholder="e.g. Save ₹50,000 by December"/>
        <div>
          <div className="text-xs text-white/50 mb-1">Category</div>
          <select value={category} onChange={e=>setCategory(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none">
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <Input label="Target value" type="number" value={target} onChange={setTarget} placeholder="100"/>
        <Input label="Unit (kg, km, ₹, chapters…)" value={unit} onChange={setUnit} placeholder="kg"/>
        <Input label="Deadline" type="date" value={deadline} onChange={setDeadline}/>
      </div>
      <div className="mt-4 flex gap-2">
        <button className="accent-bg text-white rounded-lg px-4 py-2 text-sm font-medium">Create goal</button>
        <button type="button" onClick={onCancel} className="glass rounded-lg px-4 py-2 text-sm">Cancel</button>
      </div>
    </form>
  );
}

function Input({ label, value, onChange, type='text', placeholder }) {
  return (
    <div>
      <div className="text-xs text-white/50 mb-1">{label}</div>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:accent-border"/>
    </div>
  );
}
