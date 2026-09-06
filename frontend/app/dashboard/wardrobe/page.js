'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { Plus, Trash2, Shirt, Settings2, Save, Pencil, X, Search } from 'lucide-react';
import { toast } from 'sonner';
import { usePreferences } from '@/components/PreferencesProvider';

const fetcher = url => fetch(url).then(r => r.json());
const CATEGORIES = ['top','bottom','shoes','jacket','accessory'];
const SEASONS = ['all','summer','winter','spring','fall'];

export default function Wardrobe() {
  const { format } = usePreferences();
  const { data, mutate } = useSWR('/api/wardrobe', fetcher);
  const { data: settingsData, mutate: mutateSettings } = useSWR('/api/wardrobe/settings', fetcher);
  const settings = settingsData?.settings || {};

  const [showSettings, setShowSettings] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name:'', brand:'', category:'top', color:'', season:'all', size:'', price:'' });

  async function add(e) {
    e.preventDefault();
    if (!form.name) return;
    await fetch('/api/wardrobe', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) });
    setForm({ name:'', brand:'', category:'top', color:'', season:'all', size:'', price:'' });
    setShowForm(false);
    toast.success('Item added'); mutate();
  }
  async function save(id, updates) {
    await fetch(`/api/wardrobe/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(updates) });
    setEditingId(null); toast.success('Updated'); mutate();
  }
  async function del(id) { await fetch(`/api/wardrobe/${id}`, { method:'DELETE' }); mutate(); toast.success('Deleted'); }

  const items = data?.items || [];
  const filtered = items.filter(i => (filter==='all' || i.category===filter) && (q==='' || (i.name+i.brand+i.color).toLowerCase().includes(q.toLowerCase())));

  const counts = { top:0, bottom:0, shoes:0, jacket:0, accessory:0 };
  items.forEach(i => { counts[i.category]=(counts[i.category]||0)+1; });
  const totalValue = items.reduce((s,i)=>s+(i.price||0),0);

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Wardrobe</h1>
          <p className="text-white/50 text-sm mt-1">Your digital closet.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setShowSettings(s=>!s)} className="flex items-center gap-2 text-sm glass hover:bg-white/10 rounded-lg px-3 py-2 transition"><Settings2 className="w-4 h-4"/> {showSettings?'Hide':'Edit'} sizes</button>
          <button onClick={()=>setShowForm(s=>!s)} className="flex items-center gap-2 text-sm bg-white text-black hover:bg-white/90 rounded-lg px-3 py-2 font-medium"><Plus className="w-4 h-4"/> Add item</button>
        </div>
      </div>

      {showSettings && <WardrobeSettings settings={settings} onSave={async (s)=>{ await fetch('/api/wardrobe/settings', {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(s)}); toast.success('Saved'); mutateSettings(); }} />}

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-6">
        <MiniStat label="Total items" value={items.length}/>
        <MiniStat label="Total value" value={format(totalValue)}/>
        <MiniStat label="Tops" value={counts.top}/>
        <MiniStat label="Bottoms" value={counts.bottom}/>
        <MiniStat label="Shoes" value={counts.shoes}/>
        <MiniStat label="Jackets" value={counts.jacket}/>
      </div>

      {showForm && (
        <form onSubmit={add} className="mt-6 glass-strong rounded-2xl p-6 grid md:grid-cols-4 gap-3">
          <F label="Name" v={form.name} on={v=>setForm(f=>({...f,name:v}))} />
          <F label="Brand" v={form.brand} on={v=>setForm(f=>({...f,brand:v}))} />
          <div><div className="text-xs text-white/50 mb-1">Category</div><select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm">{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
          <F label="Color" v={form.color} on={v=>setForm(f=>({...f,color:v}))} />
          <div><div className="text-xs text-white/50 mb-1">Season</div><select value={form.season} onChange={e=>setForm(f=>({...f,season:e.target.value}))} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm">{SEASONS.map(c=><option key={c}>{c}</option>)}</select></div>
          <F label="Size" v={form.size} on={v=>setForm(f=>({...f,size:v}))} />
          <F label="Price" v={form.price} on={v=>setForm(f=>({...f,price:v}))} t="number" />
          <div className="flex gap-2 items-end">
            <button className="bg-white text-black rounded-lg px-4 py-2 text-sm font-medium hover:bg-white/90">Add</button>
            <button type="button" onClick={()=>setShowForm(false)} className="glass rounded-lg px-4 py-2 text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="mt-6 flex items-center gap-3">
        <div className="flex items-center gap-2 glass rounded-lg px-3 py-2 flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-white/40"/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search wardrobe…" className="flex-1 bg-transparent outline-none text-sm"/>
        </div>
        <div className="flex gap-1">
          {['all', ...CATEGORIES].map(c => (
            <button key={c} onClick={()=>setFilter(c)} className={`text-xs px-3 py-1.5 rounded-lg capitalize transition ${filter===c?'bg-white text-black':'glass hover:bg-white/10'}`}>{c}</button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {filtered.length===0 && (
          <div className="col-span-full glass rounded-2xl p-12 text-center">
            <Shirt className="w-8 h-8 mx-auto text-fuchsia-400 mb-3"/>
            <div className="text-lg font-medium">Empty closet</div>
            <div className="text-sm text-white/50 mt-1">Add items or ask Suvio AI to help.</div>
          </div>
        )}
        {filtered.map(i => (
          <ClothingCard key={i.id} i={i} editing={editingId===i.id} onEdit={()=>setEditingId(i.id)} onCancel={()=>setEditingId(null)} onSave={(u)=>save(i.id,u)} onDelete={()=>del(i.id)} />
        ))}
      </div>
    </div>
  );
}

function ClothingCard({ i, editing, onEdit, onCancel, onSave, onDelete }) {
  const { format } = usePreferences();
  const [state, setState] = useState({ name:i.name, brand:i.brand, color:i.color, size:i.size, price:i.price, category:i.category, season:i.season });
  if (editing) {
    return (
      <div className="glass-strong rounded-2xl p-4 space-y-2">
        <F label="Name" v={state.name} on={v=>setState(s=>({...s,name:v}))} />
        <F label="Brand" v={state.brand} on={v=>setState(s=>({...s,brand:v}))} />
        <F label="Color" v={state.color} on={v=>setState(s=>({...s,color:v}))} />
        <F label="Size" v={state.size} on={v=>setState(s=>({...s,size:v}))} />
        <F label="Price" v={state.price} on={v=>setState(s=>({...s,price:v}))} t="number" />
        <div className="flex gap-2 pt-2">
          <button onClick={()=>onSave({ ...state, price:Number(state.price) })} className="bg-white text-black rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-1"><Save className="w-3.5 h-3.5"/>Save</button>
          <button onClick={onCancel} className="glass rounded-lg px-3 py-1.5 text-sm">Cancel</button>
        </div>
      </div>
    );
  }
  return (
    <div className="glass rounded-2xl p-4 group hover:bg-white/10 transition">
      <div className="h-32 rounded-lg bg-gradient-to-br from-white/10 to-white/5 grid place-items-center mb-3">
        <Shirt className="w-8 h-8 text-white/30"/>
      </div>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{i.name}</div>
          <div className="text-xs text-white/40 truncate">{i.brand || i.category}</div>
        </div>
        <div className="text-xs text-white/60">{format(i.price||0)}</div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[10px] text-white/40 capitalize">
        {i.color && <span>{i.color}</span>}
        {i.size && <span>· {i.size}</span>}
        <span className="ml-auto capitalize">{i.season}</span>
      </div>
      <div className="mt-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
        <button onClick={onEdit} className="text-white/40 hover:text-sky-400"><Pencil className="w-3.5 h-3.5"/></button>
        <button onClick={onDelete} className="text-white/40 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5"/></button>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-xs text-white/50">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function WardrobeSettings({ settings, onSave }) {
  const [topSize, setTopSize] = useState(settings.topSize || '');
  const [bottomSize, setBottomSize] = useState(settings.bottomSize || '');
  const [shoeSize, setShoeSize] = useState(settings.shoeSize || '');
  const [favColor, setFavColor] = useState(settings.favColor || '');
  const [budget, setBudget] = useState(settings.clothingBudget || '');
  return (
    <div className="mt-6 glass-strong rounded-2xl p-6">
      <div className="text-sm font-medium mb-4">Sizes & preferences</div>
      <div className="grid md:grid-cols-5 gap-3">
        <F label="Top size" v={topSize} on={setTopSize} />
        <F label="Bottom size" v={bottomSize} on={setBottomSize} />
        <F label="Shoe size" v={shoeSize} on={setShoeSize} />
        <F label="Favorite color" v={favColor} on={setFavColor} />
        <F label="Clothing budget" v={budget} on={setBudget} t="number" />
      </div>
      <button onClick={()=>onSave({ topSize, bottomSize, shoeSize, favColor, clothingBudget:Number(budget)||0 })} className="mt-4 bg-white text-black rounded-lg px-4 py-2 text-sm font-medium hover:bg-white/90 flex items-center gap-2">
        <Save className="w-3.5 h-3.5"/> Save
      </button>
    </div>
  );
}
function F({ label, v, on, t='text' }) { return (
  <div>
    <div className="text-xs text-white/50 mb-1">{label}</div>
    <input type={t} value={v} onChange={e=>on(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400/60" />
  </div>
); }
