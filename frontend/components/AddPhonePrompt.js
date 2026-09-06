'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Phone, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Shows a one-time prompt to legacy accounts that don't yet have a verified
// phone. In V1.4 signup always requires a verified phone, so this only
// triggers for pre-V1.4 accounts (or accounts created via API without OTP).
const DISMISS_KEY = 'suvio.phone.prompt.dismissedAt';

export default function AddPhonePrompt({ user }) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(1); // 1 = enter phone, 2 = enter code
  const [phone, setPhone] = useState('+91');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Only for accounts without a verified phone (typically legacy pre-V1.4 accounts).
    if (user.phoneVerified || user.phone) return;
    try {
      const d = Number(localStorage.getItem(DISMISS_KEY) || 0);
      // Show again if dismissed more than 7 days ago.
      if (Date.now() - d > 1000 * 60 * 60 * 24 * 7) {
        // Slight delay so it doesn't pop over the initial UI paint.
        const t = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(t);
      }
    } catch { setVisible(true); }
  }, [user]);

  function skip() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setVisible(false);
  }
  async function sendCode() {
    if (!/^\+\d{7,15}$/.test(phone.replace(/\s+/g, ''))) { toast.error('Enter phone in international format (e.g. +91…)'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/auth/phone/send', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ phone: phone.replace(/\s+/g,'') }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not send OTP');
      if (d.devMode) { setDevMode(true); toast('Dev mode: use code 000000'); } else toast.success('OTP sent to ' + phone);
      setStep(2);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }
  async function confirmCode() {
    setLoading(true);
    try {
      const r = await fetch('/api/auth/phone/confirm', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ code }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Invalid code');
      toast.success('Phone verified 🎉');
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
      setVisible(false);
      // Force /me refresh so the sidebar & pages get the new phoneVerified state.
      setTimeout(() => window.location.reload(), 800);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }

  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 backdrop-blur-sm p-4" data-testid="add-phone-prompt">
      <div className="w-full max-w-md glass-strong rounded-2xl p-8 relative">
        <button onClick={skip} className="absolute top-4 right-4 text-white/40 hover:text-white transition" data-testid="phone-prompt-skip"><X className="w-4 h-4"/></button>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-purple-500 grid place-items-center mb-4">
          {step === 1 ? <Phone className="w-6 h-6 text-white"/> : <ShieldCheck className="w-6 h-6 text-white"/>}
        </div>
        {step === 1 ? (
          <>
            <h2 className="text-xl font-semibold">Add your phone (optional)</h2>
            <p className="text-white/60 text-sm mt-1">Suvio uses your phone to place AI reminder calls — for tasks, water, meals & workouts. You can skip and add it later, but a verified number is required before we can call you.</p>
            <div className="mt-6">
              <label className="text-xs text-white/60">Phone number (with country code)</label>
              <div className="relative mt-1"><Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40"/><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91 98765 43210" className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:accent-border" data-testid="add-phone-input"/></div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={skip} className="flex-1 rounded-lg bg-white/5 hover:bg-white/10 py-2.5 text-sm transition" data-testid="phone-prompt-skip-btn">Skip for now</button>
              <button onClick={sendCode} disabled={loading} className="flex-1 rounded-lg accent-bg py-2.5 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2" data-testid="phone-prompt-send">
                {loading && <Loader2 className="w-4 h-4 animate-spin"/>} Send OTP
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold">Verify your phone</h2>
            <p className="text-white/60 text-sm mt-1">We've sent a code to <span className="text-white">{phone}</span></p>
            {devMode && <div className="mt-3 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">Dev mode: use <span className="font-mono">000000</span></div>}
            <input autoFocus maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} placeholder="000000" className="mt-6 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-3 text-lg font-mono tracking-[0.5em] text-center outline-none focus:accent-border" data-testid="add-phone-otp"/>
            <div className="mt-6 flex gap-3">
              <button onClick={()=>setStep(1)} className="flex-1 rounded-lg bg-white/5 hover:bg-white/10 py-2.5 text-sm transition">Back</button>
              <button onClick={confirmCode} disabled={loading || code.length<6} className="flex-1 rounded-lg accent-bg py-2.5 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2" data-testid="phone-prompt-confirm">
                {loading && <Loader2 className="w-4 h-4 animate-spin"/>} Verify
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
