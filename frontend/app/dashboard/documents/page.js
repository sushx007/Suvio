'use client';
import { useRef, useState } from 'react';
import useSWR from 'swr';
import { Upload, FileText, Image, File, Trash2, Loader2, Download, Search } from 'lucide-react';
import { toast } from 'sonner';

const fetcher = url => fetch(url).then(r => r.json());
const CATEGORIES = ['all','receipts','contracts','certificates','medical','taxes','other'];

function iconFor(mime) {
  if (!mime) return File;
  if (mime.startsWith('image/')) return Image;
  if (mime === 'application/pdf') return FileText;
  return File;
}
function fmtSize(b) { if (b<1024) return b+' B'; if (b<1024*1024) return (b/1024).toFixed(1)+' KB'; return (b/1024/1024).toFixed(1)+' MB'; }

export default function Documents() {
  const { data, mutate } = useSWR('/api/documents', fetcher);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState('other');
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const inputRef = useRef(null);

  async function upload(files) {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      for (const f of files) {
        if (f.size > 20 * 1024 * 1024) { toast.error(`${f.name} exceeds 20MB`); continue; }
        const fd = new FormData();
        fd.append('file', f);
        fd.append('category', category);
        const r = await fetch('/api/documents', { method: 'POST', body: fd });
        if (!r.ok) { const d = await r.json(); throw new Error(d.error||'Upload failed'); }
        toast.success(`${f.name} uploaded`);
      }
      mutate();
    } catch (e) { toast.error(e.message); } finally { setUploading(false); if (inputRef.current) inputRef.current.value = ''; }
  }
  async function del(id) { if (!confirm('Delete this document?')) return; await fetch(`/api/documents/${id}`, { method: 'DELETE' }); mutate(); toast.success('Deleted'); }

  const items = data?.items || [];
  const filtered = items.filter(d => (filter==='all' || d.category===filter) && (q==='' || d.name.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Documents</h1>
      <p className="text-white/50 text-sm mt-1">Upload PDFs, images, receipts. Suvio AI reads them.</p>

      {/* Upload zone */}
      <div
        onDragOver={e=>{ e.preventDefault(); }}
        onDrop={e=>{ e.preventDefault(); upload(Array.from(e.dataTransfer.files)); }}
        className="mt-6 glass-strong rounded-2xl p-8 border-2 border-dashed border-white/10 hover:border-sky-400/40 transition text-center cursor-pointer"
        onClick={()=>inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" hidden multiple onChange={e=>upload(Array.from(e.target.files))} accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.csv,.docx" />
        {uploading ? (
          <div className="flex flex-col items-center gap-3 text-white/70">
            <Loader2 className="w-8 h-8 animate-spin text-sky-400"/>
            <div className="text-sm">Uploading & extracting text…</div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-8 h-8 text-sky-400"/>
            <div className="text-lg font-medium">Drop files here or click to upload</div>
            <div className="text-xs text-white/50">PDF, images, TXT, DOCX · max 20MB each · Suvio AI can read PDFs and text files</div>
            <div className="mt-2 flex items-center gap-2">
              <label className="text-xs text-white/50">Category:</label>
              <select value={category} onChange={e=>{e.stopPropagation(); setCategory(e.target.value);}} onClick={e=>e.stopPropagation()} className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs">
                {CATEGORIES.slice(1).map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 glass rounded-lg px-3 py-2 flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-white/40"/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search documents…" className="flex-1 bg-transparent outline-none text-sm"/>
        </div>
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map(c => (
            <button key={c} onClick={()=>setFilter(c)} className={`text-xs px-3 py-1.5 rounded-lg capitalize transition ${filter===c?'bg-white text-black':'glass hover:bg-white/10'}`}>{c}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.length===0 && (
          <div className="col-span-full glass rounded-2xl p-12 text-center">
            <FileText className="w-8 h-8 mx-auto text-cyan-400 mb-3"/>
            <div className="text-lg font-medium">No documents yet</div>
            <div className="text-sm text-white/50 mt-1">Upload receipts, contracts, or notes. Then ask Suvio AI about them.</div>
          </div>
        )}
        {filtered.map(d => {
          const Icon = iconFor(d.mime);
          const isImg = d.mime?.startsWith('image/');
          return (
            <div key={d.id} className="glass rounded-2xl p-4 group hover:bg-white/10 transition">
              <div className="h-32 rounded-lg bg-gradient-to-br from-white/10 to-white/5 grid place-items-center mb-3 overflow-hidden">
                {isImg ? <img src={d.url} alt={d.name} className="w-full h-full object-cover"/> : <Icon className="w-10 h-10 text-white/40"/>}
              </div>
              <div className="text-sm font-medium truncate" title={d.name}>{d.name}</div>
              <div className="text-xs text-white/40 capitalize flex items-center justify-between mt-1">
                <span>{d.category} · {fmtSize(d.size)}</span>
              </div>
              <div className="mt-2 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <a href={d.url} target="_blank" rel="noopener" className="text-xs glass rounded px-2 py-1 hover:bg-white/10 flex items-center gap-1"><Download className="w-3 h-3"/>Open</a>
                <button onClick={()=>del(d.id)} className="ml-auto text-white/40 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5"/></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
