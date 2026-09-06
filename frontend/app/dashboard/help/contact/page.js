'use client';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Bug, Rocket, MessageCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

function ContactInner() {
  const sp = useSearchParams();
  const [tab, setTab] = useState(sp.get('tab') || 'bug');

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/dashboard/help" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition mb-6" data-testid="contact-back">
        <ArrowLeft className="w-4 h-4" /> Help Center
      </Link>
      <h1 className="text-3xl font-semibold">Contact Suvio</h1>
      <p className="text-sm text-white/50 mt-1">Report a bug, request a feature, or share feedback. Our team reviews every ticket.</p>

      <div className="mt-6 grid grid-cols-3 gap-1 bg-black/40 border border-white/10 rounded-xl p-1 text-sm">
        <Tab active={tab === 'bug'} onClick={() => setTab('bug')} icon={Bug} label="Bug" testid="tab-bug" />
        <Tab active={tab === 'feature'} onClick={() => setTab('feature')} icon={Rocket} label="Feature" testid="tab-feature" />
        <Tab active={tab === 'feedback'} onClick={() => setTab('feedback')} icon={MessageCircle} label="Feedback" testid="tab-feedback" />
      </div>

      <div className="mt-6">
        {tab === 'bug' && <BugForm />}
        {tab === 'feature' && <FeatureForm />}
        {tab === 'feedback' && <FeedbackForm />}
      </div>
    </div>
  );
}

export default function Contact() {
  return (
    <Suspense fallback={null}>
      <ContactInner />
    </Suspense>
  );
}

function Tab({ active, onClick, icon: Icon, label, testid }) {
  return (
    <button
      onClick={onClick}
      className={`py-2 rounded-lg inline-flex items-center justify-center gap-2 transition ${active ? 'accent-bg' : 'text-white/60 hover:text-white'}`}
      data-testid={testid}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

const inp = 'w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:accent-border';

function BugForm() {
  const [f, setF] = useState({ title: '', description: '', category: 'general', steps: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  async function submit(e) {
    e.preventDefault(); setBusy(true);
    try {
      const browser = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      const r = await fetch('/api/support/bug-report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, browser, device: typeof navigator !== 'undefined' ? navigator.platform : '' }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not submit');
      setDone(d.ticket); toast.success('Bug reported — thank you');
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }
  if (done) return <Done kind="Bug report" id={done.id} onReset={() => { setDone(null); setF({ title: '', description: '', category: 'general', steps: '' }); }} />;
  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Title"><input required minLength={3} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inp} placeholder="Sign-in loop after OTP" data-testid="bug-title" /></Field>
      <Field label="Category">
        <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className={inp} data-testid="bug-category">
          <option value="general">General</option><option value="auth">Auth / OTP</option><option value="ai">Suvio AI</option><option value="calls">AI Calls</option><option value="health">Health / Trainer</option><option value="payments">Payments</option><option value="ui">UI / UX</option>
        </select>
      </Field>
      <Field label="What happened?"><textarea required minLength={10} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={5} className={inp} placeholder="Describe the problem in detail…" data-testid="bug-description" /></Field>
      <Field label="Steps to reproduce (optional)"><textarea rows={3} value={f.steps} onChange={(e) => setF({ ...f, steps: e.target.value })} className={inp} placeholder="1. Open sign-up  2. Enter phone…" data-testid="bug-steps" /></Field>
      <button disabled={busy} className="w-full accent-bg rounded-lg py-2.5 font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2" data-testid="bug-submit">{busy && <Loader2 className="w-4 h-4 animate-spin" />} Submit bug report</button>
    </form>
  );
}

function FeatureForm() {
  const [f, setF] = useState({ title: '', description: '', category: 'general', priority: 'medium' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  async function submit(e) {
    e.preventDefault(); setBusy(true);
    try {
      const r = await fetch('/api/support/feature-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not submit');
      setDone(d.ticket); toast.success('Feature request submitted');
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }
  if (done) return <Done kind="Feature request" id={done.id} onReset={() => { setDone(null); setF({ title: '', description: '', category: 'general', priority: 'medium' }); }} />;
  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Title"><input required minLength={3} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inp} placeholder="Add markdown export to notes" data-testid="feature-title" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className={inp} data-testid="feature-category">
            <option value="general">General</option><option value="ai">Suvio AI</option><option value="planner">Planner</option><option value="finance">Finance</option><option value="health">Health</option><option value="ui">UI / UX</option>
          </select>
        </Field>
        <Field label="Priority">
          <select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })} className={inp} data-testid="feature-priority"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select>
        </Field>
      </div>
      <Field label="Why do you want this?"><textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={4} className={inp} placeholder="How would this help your workflow?" data-testid="feature-description" /></Field>
      <button disabled={busy} className="w-full accent-bg rounded-lg py-2.5 font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2" data-testid="feature-submit">{busy && <Loader2 className="w-4 h-4 animate-spin" />} Submit request</button>
    </form>
  );
}

function FeedbackForm() {
  const [f, setF] = useState({ rating: 5, message: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true);
    try {
      const r = await fetch('/api/support/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not submit');
      setDone(true); toast.success('Thanks for the feedback');
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }
  if (done) return <Done kind="Feedback" onReset={() => { setDone(false); setF({ rating: 5, message: '' }); }} />;
  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="How's Suvio treating you?">
        <div className="flex gap-1" data-testid="feedback-rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button type="button" key={n} onClick={() => setF({ ...f, rating: n })} className={`text-2xl transition ${n <= f.rating ? '' : 'grayscale opacity-40'}`}>{'★'}</button>
          ))}
        </div>
      </Field>
      <Field label="Anything you'd like to share?"><textarea required minLength={3} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} rows={5} className={inp} placeholder="What's working? What could be better?" data-testid="feedback-message" /></Field>
      <button disabled={busy} className="w-full accent-bg rounded-lg py-2.5 font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2" data-testid="feedback-submit">{busy && <Loader2 className="w-4 h-4 animate-spin" />} Send feedback</button>
    </form>
  );
}

function Field({ label, children }) {
  return (<div><label className="text-xs text-white/60">{label}</label>{children}</div>);
}
function Done({ kind, id, onReset }) {
  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
      <div className="w-12 h-12 rounded-2xl mx-auto bg-emerald-500/20 grid place-items-center mb-3"><CheckCircle2 className="w-6 h-6 text-emerald-300" /></div>
      <div className="font-semibold">{kind} received</div>
      {id && <div className="text-xs text-white/40 mt-1 font-mono">ref: {id.slice(0, 8)}</div>}
      <div className="text-sm text-white/60 mt-2">We review every ticket. Thanks for helping us make Suvio better.</div>
      <button onClick={onReset} className="mt-4 text-sm accent-bg rounded-lg px-4 py-2 font-semibold hover:opacity-90 transition">Submit another</button>
    </div>
  );
}
