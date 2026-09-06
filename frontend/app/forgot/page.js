'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Loader2, Phone, ShieldCheck, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function Forgot() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1 = enter phone, 2 = OTP + new password
  const [phone, setPhone] = useState('+91');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [devMode, setDevMode] = useState(false);

  async function sendOtp(e) {
    e.preventDefault();
    if (!/^\+\d{7,15}$/.test(phone.replace(/\s+/g, ''))) {
      toast.error('Enter phone in international format, e.g. +91 98765 43210');
      return;
    }
    setLoading(true);
    try {
      const r = await fetch('/api/auth/forgot/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.replace(/\s+/g, '') }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not send OTP');
      if (d.devMode) {
        setDevMode(true);
        toast('Twilio not configured', { description: 'Dev mode: enter code 000000' });
      } else {
        toast.success('If this number is registered, an OTP has been sent.');
      }
      setStep(2);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitReset(e) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const r = await fetch('/api/auth/forgot/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.replace(/\s+/g, ''), code, newPassword }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Reset failed');
      toast.success('Password reset. You are now signed in.');
      router.push('/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid-bg grid place-items-center px-6 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-10" data-testid="forgot-logo">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-400 to-purple-500 grid place-items-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-xl">Suvio</span>
        </Link>
        <div className="glass-strong rounded-2xl p-8">
          {step === 1 ? (
            <>
              <h1 className="text-2xl font-semibold">Forgot your password?</h1>
              <p className="text-white/50 text-sm mt-1">
                Enter your registered phone number and we'll send you a verification code.
              </p>
              <form onSubmit={sendOtp} className="space-y-4 mt-6">
                <div>
                  <label className="text-xs text-white/60">Phone number</label>
                  <div className="relative mt-1">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 pl-9 text-sm outline-none focus:accent-border"
                      placeholder="+91 98765 43210"
                      data-testid="forgot-phone"
                    />
                  </div>
                </div>
                <button
                  disabled={loading}
                  className="w-full accent-bg rounded-lg py-2.5 font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  data-testid="forgot-send-otp"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />} Send OTP
                </button>
              </form>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition mb-4"
                data-testid="forgot-back"
              >
                <ArrowLeft className="w-4 h-4" /> Change phone number
              </button>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-purple-500 grid place-items-center mb-4">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-semibold">Set a new password</h1>
              <p className="text-white/50 text-sm mt-1">
                Enter the OTP sent to <span className="text-white">{phone}</span> and choose a new password.
              </p>
              {devMode && (
                <div className="mt-3 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  Dev mode: use <span className="font-mono">000000</span>
                </div>
              )}
              <form onSubmit={submitReset} className="mt-6 space-y-4">
                <div>
                  <label className="text-xs text-white/60">OTP code</label>
                  <input
                    required
                    autoFocus
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:accent-border tracking-[0.5em] text-center font-mono text-lg"
                    placeholder="000000"
                    data-testid="forgot-otp"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60">New password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:accent-border"
                    placeholder="At least 6 characters"
                    data-testid="forgot-new-password"
                  />
                </div>
                <button
                  disabled={loading || code.length < 6 || newPassword.length < 6}
                  className="w-full accent-bg rounded-lg py-2.5 font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  data-testid="forgot-submit"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />} Reset password
                </button>
              </form>
            </>
          )}
          <p className="mt-6 text-sm text-white/50 text-center">
            Remembered it?{' '}
            <Link href="/login" className="accent-text hover:underline" data-testid="forgot-login-link">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
