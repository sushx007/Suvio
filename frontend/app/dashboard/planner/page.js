'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { Plus, Check, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const fetcher = url => fetch(url).then(r => r.json());

export default function Planner() {
  const { data, mutate } = useSWR('/api/tasks', fetcher);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('work');
  const [adding, setAdding] = useState(false);

  async function addTask(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setAdding(true);
    try {
      const r = await fetch('/api/tasks', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ title, priority, category }) });
      if (!r.ok) throw new Error();
      setTitle('');
      toast.success('Task added');
      mutate();
    } catch { toast.error('Failed'); } finally { setAdding(false); }
  }

  async function toggle(t) {
    await fetch(`/api/tasks/${t.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ completed: !t.completed }) });
    mutate();
  }
  async function del(t) {
    await fetch(`/api/tasks/${t.id}`, { method:'DELETE' });
    mutate();
  }

  const items = data?.items || [];
  const open = items.filter(t => !t.completed);
  const done = items.filter(t => t.completed);

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Planner</h1>
      <p className="text-white/50 text-sm mt-1">Tasks, priorities, focus.</p>

      <form onSubmit={addTask} className="mt-8 glass-strong rounded-2xl p-4 flex gap-2">
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Add a task…" className="flex-1 bg-transparent outline-none px-2 text-sm" />
        <select value={priority} onChange={e=>setPriority(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 text-xs text-white/80">
          <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
        </select>
        <select value={category} onChange={e=>setCategory(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 text-xs text-white/80">
          <option>work</option><option>personal</option><option>health</option><option>finance</option>
        </select>
        <button disabled={adding} className="bg-white text-black rounded-lg px-4 py-2 text-sm font-medium hover:bg-white/90 disabled:opacity-50 flex items-center gap-1">
          {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Plus className="w-3.5 h-3.5"/>} Add
        </button>
      </form>

      <div className="mt-8">
        <div className="text-xs uppercase tracking-widest text-white/40 mb-3">Open · {open.length}</div>
        <div className="glass rounded-2xl divide-y divide-white/5">
          {open.map(t => (
            <TaskRow key={t.id} t={t} onToggle={()=>toggle(t)} onDelete={()=>del(t)} />
          ))}
          {open.length===0 && <div className="p-8 text-center text-white/40 text-sm">Nothing pending. Nice.</div>}
        </div>
      </div>

      {done.length>0 && (
        <div className="mt-8">
          <div className="text-xs uppercase tracking-widest text-white/40 mb-3">Completed · {done.length}</div>
          <div className="glass rounded-2xl divide-y divide-white/5">
            {done.slice(0,10).map(t => <TaskRow key={t.id} t={t} onToggle={()=>toggle(t)} onDelete={()=>del(t)} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskRow({ t, onToggle, onDelete }) {
  const priColor = t.priority==='high'?'bg-rose-400':t.priority==='low'?'bg-white/30':'bg-sky-400';
  return (
    <div className="flex items-center gap-3 px-4 py-3 group">
      <button onClick={onToggle} className={`w-5 h-5 rounded-full border ${t.completed?'bg-sky-500 border-sky-500':'border-white/20 hover:border-sky-400'} grid place-items-center transition`}>
        {t.completed && <Check className="w-3 h-3 text-white"/>}
      </button>
      <div className={`w-1.5 h-1.5 rounded-full ${priColor}`} />
      <span className={`text-sm flex-1 ${t.completed?'line-through text-white/40':''}`}>{t.title}</span>
      <span className="text-xs text-white/40">{t.category}</span>
      <button onClick={onDelete} className="text-white/30 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition"><Trash2 className="w-3.5 h-3.5"/></button>
    </div>
  );
}
