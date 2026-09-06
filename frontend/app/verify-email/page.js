'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, MailCheck, MailWarning, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

function VerifyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token');
  const [status, setStatus] = useState(token ? 'verifying' : 'awaiting');
  const [message, setMessage] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const r = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Verification failed');
        setStatus('ok'); setMessage(d.message || 'Your email has been verified. You can now sign in.');
      } catch (e) { setStatus('err'); setMessage(e.message); }
    })();
  }, [token]);

  async function resend() {
    setResending(true);
    try {
      const r = await fetch('/api/auth/resend-verification', { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not resend');
      toast.success(d.devMode ? 'Provider not configured — check the browser console for the verification link' : 'Verification email sent');
      if (d.devLink) console.log('Verification link:', d.devLink);
    } catch (e) { toast.error(e.message); } finally { setResending(false); }
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-white grid place-items-center p-6">
      <div className="max-w-md w-full glass-strong rounded-2xl p-8 text-center">
        {status === 'verifying' && <><Loader2 className="w-8 h-8 mx-auto animate-spin text-sky-400"/><h1 className="mt-4 text-2xl font-semibold">Verifying your email…</h1></>}
        {status === 'ok' && <>
          <MailCheck className="w-10 h-10 mx-auto text-emerald-400"/>
          <h1 className="mt-4 text-2xl font-semibold">You're verified 🎉</h1>
          <p className="mt-2 text-white/60 text-sm">{message}</p>
          <button onClick={()=>router.push('/login')} className="mt-6 bg-white text-black rounded-xl px-5 py-2.5 font-semibold hover:bg-white/90 transition">Go to sign in</button>
        </>}
        {status === 'err' && <>
          <MailWarning className="w-10 h-10 mx-auto text-rose-400"/>
          <h1 className="mt-4 text-2xl font-semibold">Verification failed</h1>
          <p className="mt-2 text-white/60 text-sm">{message}</p>
          <button onClick={resend} disabled={resending} className="mt-6 bg-white/10 hover:bg-white/20 rounded-xl px-5 py-2.5 text-sm flex items-center gap-2 mx-auto disabled:opacity-40">
            {resending ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCcw className="w-4 h-4"/>} Resend verification email
          </button>
        </>}
        {status === 'awaiting' && <>
          <MailCheck className="w-10 h-10 mx-auto text-sky-400"/>
          <h1 className="mt-4 text-2xl font-semibold">Please verify your email</h1>
          <p className="mt-2 text-white/60 text-sm">We've sent you a verification link. Click it to activate your account.</p>
          <button onClick={resend} disabled={resending} className="mt-6 bg-white/10 hover:bg-white/20 rounded-xl px-5 py-2.5 text-sm flex items-center gap-2 mx-auto disabled:opacity-40" data-testid="resend-verify">
            {resending ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCcw className="w-4 h-4"/>} Resend email
          </button>
        </>}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return <Suspense fallback={<div className="min-h-screen grid place-items-center bg-[#09090B] text-white"><Loader2 className="w-6 h-6 animate-spin"/></div>}><VerifyInner/></Suspense>;
}
