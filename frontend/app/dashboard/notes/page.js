'use client';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Plus, Trash2, StickyNote } from 'lucide-react';
import { toast } from 'sonner';

const fetcher = url => fetch(url).then(r => r.json());

export default function Notes() {
  const { data, mutate } = useSWR('/api/notes', fetcher);
  const [selectedId, setSelectedId] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const items = data?.items || [];
  const selected = items.find(n => n.id === selectedId);

  useEffect(() => {
    if (selected) { setTitle(selected.title); setContent(selected.content || ''); }
  }, [selectedId]);

  async function newNote() {
    const r = await fetch('/api/notes', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title: 'Untitled', content: '' }) });
    const d = await r.json();
    mutate();
    setSelectedId(d.item.id);
  }

  async function save() {
    if (!selected) return;
    await fetch(`/api/notes/${selected.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title, content }) });
    toast.success('Saved');
    mutate();
  }

  async function del() {
    if (!selected) return;
    await fetch(`/api/notes/${selected.id}`, { method:'DELETE' });
    setSelectedId(null);
    mutate();
  }

  return (
    <div className="h-full flex">
      <div className="w-72 border-r border-white/5 p-3 flex flex-col">
        <button onClick={newNote} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm transition">
          <Plus className="w-4 h-4" /> New note
        </button>
        <div className="mt-4 space-y-1 flex-1 overflow-y-auto scrollbar-thin">
          {items.map(n => (
            <button key={n.id} onClick={()=>setSelectedId(n.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${selectedId===n.id?'bg-white/10':'hover:bg-white/5'}`}>
              <div className="font-medium truncate">{n.title || 'Untitled'}</div>
              <div className="text-xs text-white/40 truncate">{(n.content||'').slice(0,40) || 'Empty'}</div>
            </button>
          ))}
          {items.length===0 && <div className="text-center text-xs text-white/30 py-8">No notes yet</div>}
        </div>
      </div>
      <div className="flex-1 p-8">
        {selected ? (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <input value={title} onChange={e=>setTitle(e.target.value)} onBlur={save} className="text-3xl font-semibold bg-transparent outline-none flex-1" />
              <button onClick={del} className="text-white/40 hover:text-rose-400 transition"><Trash2 className="w-4 h-4"/></button>
            </div>
            <textarea value={content} onChange={e=>setContent(e.target.value)} onBlur={save} placeholder="Start writing…" className="w-full min-h-[60vh] bg-transparent outline-none text-white/90 leading-relaxed resize-none" />
          </div>
        ) : (
          <div className="h-full grid place-items-center text-white/40">
            <div className="text-center">
              <StickyNote className="w-8 h-8 mx-auto mb-3 opacity-40"/>
              <div className="text-sm">Select or create a note</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
