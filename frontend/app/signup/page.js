'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Loader2, Globe, Phone, ShieldCheck, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { CURRENCIES } from '@/lib/preferences';

export default function Signup() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1 = details+phone, 2 = OTP
  const [name, setName] = useState('');
  const [email, setEmail] = useState(''); // optional
  const [phone, setPhone] = useState('+91');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [code, setCode] = useState('');
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
      const r = await fetch('/api/auth/signup/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email || undefined, phone: phone.replace(/\s+/g, '') }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not send OTP');
      if (d.devMode) {
        setDevMode(true);
        toast('Twilio not configured', { description: 'Dev mode: enter code 000000' });
      } else {
        toast.success('OTP sent to ' + phone);
      }
      setStep(2);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function finishSignup(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: email || undefined,
          password,
          currency,
          phone: phone.replace(/\s+/g, ''),
          code,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Signup failed');
      toast.success('Welcome to Suvio!');
      router.push('/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setLoading(true);
    try {
      const r = await fetch('/api/auth/signup/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email || undefined, phone: phone.replace(/\s+/g, '') }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success('OTP re-sent');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid-bg grid place-items-center px-6 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-10" data-testid="signup-logo">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-400 to-purple-500 grid place-items-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-xl">Suvio</span>
        </Link>
        <div className="glass-strong rounded-2xl p-8">
          {step === 1 ? (
            <>
              <h1 className="text-2xl font-semibold">Create your OS</h1>
              <p className="text-white/50 text-sm mt-1">
                Free Forever plan. Verified phone number required.
              </p>
              <form onSubmit={sendOtp} className="space-y-4 mt-6">
                <Field label="Name">
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inp}
                    placeholder="Alex"
                    data-testid="signup-name"
                  />
                </Field>
                <Field label="Phone number (with country code)">
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      required
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={inp + ' pl-9'}
                      placeholder="+91 98765 43210"
                      data-testid="signup-phone"
                    />
                  </div>
                </Field>
                <Field label="Password">
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inp}
                    placeholder="At least 6 characters"
                    data-testid="signup-password"
                  />
                </Field>
                <Field label={<span className="text-white/60">Email <span className="text-white/40">(optional)</span></span>}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inp}
                    placeholder="you@example.com"
                    data-testid="signup-email"
                  />
                </Field>
                <Field
                  label={
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      Preferred currency
                    </span>
                  }
                >
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className={inp}
                    data-testid="signup-currency"
                  >
                    {Object.entries(CURRENCIES).map(([code, c]) => (
                      <option key={code} value={code}>
                        {c.symbol} {code} — {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <button
                  disabled={loading}
                  className="w-full accent-bg rounded-lg py-2.5 font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  data-testid="signup-send-otp"
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
                data-testid="signup-back"
              >
                <ArrowLeft className="w-4 h-4" /> Edit details
              </button>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-purple-500 grid place-items-center mb-4">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-semibold">Verify your phone</h1>
              <p className="text-white/50 text-sm mt-1">
                We've sent a 6-digit code to <span className="text-white">{phone}</span>
              </p>
              {devMode && (
                <div className="mt-3 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  Dev mode: use <span className="font-mono">000000</span>
                </div>
              )}
              <form onSubmit={finishSignup} className="mt-6 space-y-4">
                <Field label="OTP code">
                  <input
                    required
                    autoFocus
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className={inp + ' tracking-[0.5em] text-center font-mono text-lg'}
                    placeholder="000000"
                    data-testid="signup-otp"
                  />
                </Field>
                <button
                  disabled={loading || code.length < 6}
                  className="w-full accent-bg rounded-lg py-2.5 font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  data-testid="signup-confirm-otp"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />} Verify & create account
                </button>
                <button
                  type="button"
                  onClick={resendOtp}
                  disabled={loading}
                  className="w-full text-xs text-white/50 hover:text-white transition"
                  data-testid="signup-resend-otp"
                >
                  Didn't get a code? Resend
                </button>
              </form>
            </>
          )}
          <p className="mt-6 text-sm text-white/50 text-center">
            Already have one?{' '}
            <Link href="/login" className="accent-text hover:underline" data-testid="signup-login-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const inp =
  'mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:accent-border';
function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs text-white/60">{label}</label>
      {children}
    </div>
  );
}
