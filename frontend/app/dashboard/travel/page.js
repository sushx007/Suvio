'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { Plus, Trash2, Plane, MapPin, Calendar, DollarSign, Settings2, Save, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { usePreferences } from '@/components/PreferencesProvider';

const fetcher = url => fetch(url).then(r => r.json());

export default function Travel() {
  const { data, mutate } = useSWR('/api/trips', fetcher);
  const { data: settingsData, mutate: mutateSettings } = useSWR('/api/travel/settings', fetcher);
  const settings = settingsData?.settings || {};

  const [showSettings, setShowSettings] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ destination: '', country: '', startDate: '', endDate: '', budget: '', notes: '' });

  async function add(e) {
    e.preventDefault();
    if (!form.destination) return;
    await fetch('/api/trips', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) });
    setForm({ destination: '', country: '', startDate: '', endDate: '', budget: '', notes: '' });
    setShowForm(false);
    toast.success('Trip added'); mutate();
  }
  async function save(id, updates) {
    await fetch(`/api/trips/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(updates) });
    setEditingId(null); toast.success('Updated'); mutate();
  }
  async function del(id) { await fetch(`/api/trips/${id}`, { method:'DELETE' }); mutate(); toast.success('Deleted'); }

  const items = data?.items || [];

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Travel</h1>
          <p className="text-white/50 text-sm mt-1">Trips, plans, memories.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setShowSettings(s=>!s)} className="flex items-center gap-2 text-sm glass hover:bg-white/10 rounded-lg px-3 py-2 transition">
            <Settings2 className="w-4 h-4"/> {showSettings?'Hide':'Edit'} prefs
          </button>
          <button onClick={()=>setShowForm(s=>!s)} className="flex items-center gap-2 text-sm bg-white text-black hover:bg-white/90 rounded-lg px-3 py-2 font-medium">
            <Plus className="w-4 h-4"/> New trip
          </button>
        </div>
      </div>

      {showSettings && <TravelSettings settings={settings} onSave={async (s)=>{ await fetch('/api/travel/settings', {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(s)}); toast.success('Saved'); mutateSettings(); }} />}

      {showForm && (
        <form onSubmit={add} className="mt-6 glass-strong rounded-2xl p-6 grid md:grid-cols-3 gap-3">
          <F label="Destination" v={form.destination} on={v=>setForm(f=>({...f,destination:v}))} />
          <F label="Country" v={form.country} on={v=>setForm(f=>({...f,country:v}))} />
          <F label="Budget" v={form.budget} on={v=>setForm(f=>({...f,budget:v}))} t="number" />
          <F label="Start date" v={form.startDate} on={v=>setForm(f=>({...f,startDate:v}))} t="date" />
          <F label="End date" v={form.endDate} on={v=>setForm(f=>({...f,endDate:v}))} t="date" />
          <F label="Notes" v={form.notes} on={v=>setForm(f=>({...f,notes:v}))} />
          <div className="md:col-span-3 flex gap-2">
            <button className="bg-white text-black rounded-lg px-4 py-2 text-sm font-medium hover:bg-white/90">Create trip</button>
            <button type="button" onClick={()=>setShowForm(false)} className="glass hover:bg-white/10 rounded-lg px-4 py-2 text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        {items.length===0 && !showForm && (
          <div className="md:col-span-2 glass rounded-2xl p-12 text-center">
            <Plane className="w-8 h-8 mx-auto text-sky-400 mb-3"/>
            <div className="text-lg font-medium">No trips yet</div>
            <div className="text-sm text-white/50 mt-1">Plan your next adventure. Or ask Suvio AI to plan one for you.</div>
          </div>
        )}
        {items.map(t => (
          <TripCard key={t.id} t={t} editing={editingId===t.id} onEdit={()=>setEditingId(t.id)} onCancel={()=>setEditingId(null)} onSave={(u)=>save(t.id,u)} onDelete={()=>del(t.id)} />
        ))}
      </div>
    </div>
  );
}

function TripCard({ t, editing, onEdit, onCancel, onSave, onDelete }) {
  const { format } = usePreferences();
  const [dest, setDest] = useState(t.destination);
  const [country, setCountry] = useState(t.country || '');
  const [budget, setBudget] = useState(t.budget || 0);
  const [start, setStart] = useState(t.startDate ? t.startDate.slice(0,10) : '');
  const [end, setEnd] = useState(t.endDate ? t.endDate.slice(0,10) : '');
  const [notes, setNotes] = useState(t.notes || '');
  if (editing) {
    return (
      <div className="glass-strong rounded-2xl p-5 space-y-2">
        <F label="Destination" v={dest} on={setDest} />
        <div className="grid grid-cols-2 gap-2">
          <F label="Country" v={country} on={setCountry} />
          <F label="Budget" v={budget} on={setBudget} t="number" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <F label="Start" v={start} on={setStart} t="date" />
          <F label="End" v={end} on={setEnd} t="date" />
        </div>
        <F label="Notes" v={notes} on={setNotes} />
        <div className="flex gap-2 pt-2">
          <button onClick={()=>onSave({ destination:dest, country, budget:Number(budget), startDate:start, endDate:end, notes })} className="bg-white text-black rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-1"><Save className="w-3.5 h-3.5"/>Save</button>
          <button onClick={onCancel} className="glass rounded-lg px-3 py-1.5 text-sm">Cancel</button>
        </div>
      </div>
    );
  }
  return (
    <div className="glass rounded-2xl p-5 group">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-sky-500/10 grid place-items-center text-sky-400"><Plane className="w-5 h-5"/></div>
        <div className="flex-1">
          <div className="text-lg font-semibold">{t.destination}</div>
          <div className="text-xs text-white/40 flex items-center gap-1"><MapPin className="w-3 h-3"/>{t.country || 'Anywhere'}</div>
        </div>
        <button onClick={onEdit} className="text-white/30 hover:text-sky-400 opacity-0 group-hover:opacity-100 transition"><Pencil className="w-4 h-4"/></button>
        <button onClick={onDelete} className="text-white/30 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition"><Trash2 className="w-4 h-4"/></button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><Calendar className="w-3 h-3 inline mr-1 text-white/40"/>{t.startDate ? new Date(t.startDate).toLocaleDateString() : '—'} → {t.endDate ? new Date(t.endDate).toLocaleDateString() : '—'}</div>
        <div><DollarSign className="w-3 h-3 inline mr-1 text-white/40"/>{format(t.budget||0)}</div>
      </div>
      {t.notes && <div className="mt-3 text-sm text-white/60">{t.notes}</div>}
    </div>
  );
}

function TravelSettings({ settings, onSave }) {
  const [homeAirport, setHomeAirport] = useState(settings.homeAirport || '');
  const [airline, setAirline] = useState(settings.airline || '');
  const [hotel, setHotel] = useState(settings.hotel || '');
  const [currency, setCurrency] = useState(settings.currency || 'USD');
  return (
    <div className="mt-6 glass-strong rounded-2xl p-6">
      <div className="text-sm font-medium mb-4">Travel preferences</div>
      <div className="grid md:grid-cols-4 gap-3">
        <F label="Home airport" v={homeAirport} on={setHomeAirport} />
        <F label="Preferred airline" v={airline} on={setAirline} />
        <F label="Hotel preference" v={hotel} on={setHotel} />
        <F label="Currency" v={currency} on={setCurrency} />
      </div>
      <button onClick={()=>onSave({ homeAirport, airline, hotel, currency })} className="mt-4 bg-white text-black rounded-lg px-4 py-2 text-sm font-medium hover:bg-white/90 flex items-center gap-2">
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
