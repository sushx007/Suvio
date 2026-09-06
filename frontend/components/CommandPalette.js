'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command as CmdIcon, Search, CheckCircle2, Wallet, StickyNote, Droplet, Brain, LayoutDashboard, ArrowRight, Plane, Shirt, Settings } from 'lucide-react';
import { toast } from 'sonner';

export default function CommandPalette({ open, onOpenChange }) {
  const router = useRouter();
  const [q, setQ] = useState('');

  const actions = [
    { icon: Brain, label: 'Open Suvio AI', hint: 'Ask anything', run: () => router.push('/dashboard/ai') },
    { icon: LayoutDashboard, label: 'Overview', hint: 'Dashboard', run: () => router.push('/dashboard') },
    { icon: CheckCircle2, label: 'Add Task', hint: 'Planner', run: () => router.push('/dashboard/planner') },
    { icon: Wallet, label: 'Add Expense', hint: 'Finance', run: () => router.push('/dashboard/finance') },
    { icon: StickyNote, label: 'New Note', hint: 'Notes', run: () => router.push('/dashboard/notes') },
    { icon: Shirt, label: 'Add Clothing', hint: 'Wardrobe', run: () => router.push('/dashboard/wardrobe') },
    { icon: Plane, label: 'Add Trip', hint: 'Travel', run: () => router.push('/dashboard/travel') },
    { icon: Droplet, label: 'Log Water (+250ml)', hint: 'Health', run: async () => {
      await fetch('/api/health/water', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ml: 250 }) });
      toast.success('+250ml logged');
    } },
    { icon: Settings, label: 'Settings', hint: 'Preferences', run: () => router.push('/dashboard/settings') },
  ];

  const filtered = actions.filter(a => a.label.toLowerCase().includes(q.toLowerCase()) || a.hint.toLowerCase().includes(q.toLowerCase()));

  useEffect(() => { if (open) setQ(''); }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-start pt-32 px-4 bg-black/60 backdrop-blur-sm" onClick={() => onOpenChange(false)}>
      <div onClick={e=>e.stopPropagation()} className="w-full max-w-xl glass-strong rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <Search className="w-4 h-4 text-white/40" />
          <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Type a command or search…" className="flex-1 bg-transparent outline-none text-sm" />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-white/10">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto scrollbar-thin p-2">
          {filtered.map((a, i) => (
            <button key={i} onClick={() => { a.run(); onOpenChange(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition text-left">
              <a.icon className="w-4 h-4 text-sky-400" />
              <div className="flex-1">
                <div className="text-sm">{a.label}</div>
                <div className="text-xs text-white/40">{a.hint}</div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-white/30"/>
            </button>
          ))}
          {filtered.length===0 && <div className="py-8 text-center text-sm text-white/40">No matches</div>}
        </div>
      </div>
    </div>
  );
}
