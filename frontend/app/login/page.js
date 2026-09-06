'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Loader2, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState('phone'); // 'phone' | 'email'
  const [phone, setPhone] = useState('+91');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const errCode = searchParams.get('error');
    if (errCode) toast.error('Sign-in failed. Please try again.');
  }, [searchParams]);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const body =
        mode === 'phone'
          ? { phone: phone.replace(/\s+/g, ''), password }
          : { email: email.trim().toLowerCase(), password };
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Login failed');
      toast.success('Welcome back');
      router.push('/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid-bg grid place-items-center px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-10" data-testid="login-logo">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-400 to-purple-500 grid place-items-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-xl">Suvio</span>
        </Link>
        <div className="glass-strong rounded-2xl p-8">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-white/50 text-sm mt-1">Sign in with your phone number or email.</p>

          {/* Segmented control: phone / email */}
          <div className="mt-6 grid grid-cols-2 gap-1 bg-black/40 border border-white/10 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setMode('phone')}
              className={`text-sm py-2 rounded-md transition flex items-center justify-center gap-2 ${
                mode === 'phone' ? 'accent-bg' : 'text-white/60 hover:text-white'
              }`}
              data-testid="login-tab-phone"
            >
              <Phone className="w-4 h-4" /> Phone
            </button>
            <button
              type="button"
              onClick={() => setMode('email')}
              className={`text-sm py-2 rounded-md transition flex items-center justify-center gap-2 ${
                mode === 'email' ? 'accent-bg' : 'text-white/60 hover:text-white'
              }`}
              data-testid="login-tab-email"
            >
              <Mail className="w-4 h-4" /> Email
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4 mt-6">
            {mode === 'phone' ? (
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
                    data-testid="login-phone"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="text-xs text-white/60">Email address</label>
                <div className="relative mt-1">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 pl-9 text-sm outline-none focus:accent-border"
                    placeholder="you@example.com"
                    data-testid="login-email"
                  />
                </div>
              </div>
            )}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-white/60">Password</label>
                <Link
                  href="/forgot"
                  className="text-xs accent-text hover:underline"
                  data-testid="login-forgot-link"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:accent-border"
                placeholder="••••••••"
                data-testid="login-password"
              />
            </div>
            <button
              disabled={loading}
              className="w-full accent-bg rounded-lg py-2.5 font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              data-testid="login-submit"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Sign in
            </button>
          </form>
          <p className="mt-6 text-sm text-white/50 text-center">
            No account?{' '}
            <Link href="/signup" className="accent-text hover:underline" data-testid="login-signup-link">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
