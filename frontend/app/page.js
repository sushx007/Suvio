'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Sparkles, Brain, Zap, Shield, Command, Wallet, Heart, Shirt, Plane, FileText, StickyNote, Calendar, TrendingUp, CheckCircle2, PlayCircle, Check } from 'lucide-react';
import DemoModal from '@/components/DemoModal';
import InstallButton from '@/components/InstallButton';

const modules = [
  { icon: Calendar, name: 'Planner', desc: 'Tasks, goals, habits & AI scheduling', color: 'from-sky-500/20 to-sky-500/5' },
  { icon: Wallet, name: 'Finance', desc: 'Budgets, subscriptions & AI advisor', color: 'from-emerald-500/20 to-emerald-500/5' },
  { icon: Heart, name: 'Health', desc: 'Water, sleep, workouts & wellness score', color: 'from-rose-500/20 to-rose-500/5' },
  { icon: Shirt, name: 'Wardrobe', desc: 'Digital closet with outfit AI', color: 'from-fuchsia-500/20 to-fuchsia-500/5' },
  { icon: Plane, name: 'Travel', desc: 'Trips, itineraries & packing AI', color: 'from-amber-500/20 to-amber-500/5' },
  { icon: StickyNote, name: 'Notes', desc: 'Rich notes with AI rewrite & summaries', color: 'from-violet-500/20 to-violet-500/5' },
  { icon: FileText, name: 'Documents', desc: 'Vault with OCR & smart search', color: 'from-cyan-500/20 to-cyan-500/5' },
  { icon: Brain, name: 'Suvio AI', desc: 'Your Chief of Staff. Sees everything.', color: 'from-blue-500/20 to-purple-500/10' },
];

const features = [
  { icon: Brain, title: 'One AI That Knows Everything', desc: 'Suvio AI has context across every module — finance, health, notes, wardrobe. It thinks like a Chief of Staff.' },
  { icon: Command, title: 'Command Palette', desc: 'Press ⌘K anywhere. Add expenses, log water, jot a note, plan a trip — all in one keystroke.' },
  { icon: Zap, title: 'Proactive Intelligence', desc: '"You overspent on restaurants." "You haven\'t worn this jacket in 8 months." "Sleep declined this week."' },
  { icon: Shield, title: 'Private by Design', desc: 'Long-term memory you control. View, edit, delete anything the AI remembers about you.' },
];

const plans = [
  { id: 'free', name: 'Free', price: '₹0', period: 'forever', features: ['20 tasks · 10 notes · 3 documents', '10 AI messages / day', 'Core planner + finance', 'No credit card'], cta: 'Start free', highlight: false },
  { id: 'pro_yearly', name: 'Pro', price: '₹2,499', period: '/ year', features: ['More tasks, notes, documents', '100 AI messages / day', 'Basic analytics', 'Priority support'], cta: 'Choose Pro', highlight: false },
  { id: 'standard_yearly', name: 'Standard', price: '₹4,999', period: '/ year', badge: 'Popular', features: ['Advanced analytics', 'AI planning & summaries', 'AI phone reminders', '500 AI messages / day'], cta: 'Choose Standard', highlight: true },
  { id: 'premium_yearly', name: 'Premium', price: '₹8,999', period: '/ year', badge: 'Complete', features: ['Unlimited everything', 'All future premium features', 'Concierge support', 'Founding member perks'], cta: 'Choose Premium', highlight: false },
];

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#09090B] text-white overflow-x-hidden">
      {/* NAV */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all ${scrolled ? 'glass-strong border-b border-white/5' : ''}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          {/* Logo is branding only on public pages — does NOT toggle any sidebar. */}
          <Link href="/" className="flex items-center gap-2" data-testid="landing-logo">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-purple-500 grid place-items-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold tracking-tight text-lg">Suvio</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#modules" className="hover:text-white transition">Modules</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <InstallButton variant="ghost" className="hidden sm:inline-flex" />
            <Link href="/login" className="text-sm text-white/80 hover:text-white transition" data-testid="nav-signin">Sign in</Link>
            <Link href="/signup" className="text-sm bg-white text-black px-4 py-2 rounded-lg hover:bg-white/90 transition font-medium" data-testid="nav-signup">Start free</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-40 pb-24 grid-bg">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.15] pb-2 text-gradient">
            Your Life,<br />Organized By AI.
          </h1>
          <p className="mt-8 text-lg md:text-xl text-white/60 max-w-2xl mx-auto">
            Stop juggling 10 apps. Suvio unifies your tasks, finance, health, notes, wardrobe and travel — with one AI that actually knows you.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup" className="group inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-medium hover:bg-white/90 transition glow-sky" data-testid="hero-get-started">
              Get started — it's free <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
            </Link>
            <InstallButton className="!px-6 !py-3 !rounded-xl" />
            <button onClick={() => setDemoOpen(true)} className="inline-flex items-center gap-2 glass px-6 py-3 rounded-xl font-medium hover:bg-white/10 transition" data-testid="hero-demo">
              <PlayCircle className="w-5 h-5 text-sky-400"/> Watch demo
            </button>
          </div>
          <div className="mt-4 text-xs text-white/40">Start free forever. Installs like a native app — no App Store required.</div>

          {/* Preview card */}
          <div className="mt-16 relative">
            <div className="absolute inset-x-20 -inset-y-10 bg-gradient-to-r from-sky-500/20 via-purple-500/10 to-transparent blur-3xl -z-10" />
            <div className="glass-strong rounded-2xl p-2 shadow-2xl">
              <div className="rounded-xl bg-[#0c0c10] p-6 md:p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Today', value: '7 tasks', icon: CheckCircle2, tint: 'text-sky-400' },
                    { label: 'Spent', value: '₹9,240', icon: Wallet, tint: 'text-emerald-400' },
                    { label: 'Sleep', value: '7.4 h', icon: Heart, tint: 'text-rose-400' },
                    { label: 'AI Insights', value: '3 new', icon: Brain, tint: 'text-purple-400' },
                  ].map((s, i) => (
                    <div key={i} className="glass rounded-xl p-4 text-left">
                      <s.icon className={`w-4 h-4 ${s.tint} mb-3`} />
                      <div className="text-xs text-white/50">{s.label}</div>
                      <div className="text-lg font-semibold mt-1">{s.value}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 glass rounded-xl p-4 text-left">
                  <div className="flex items-center gap-2 text-xs text-white/50 mb-2"><Brain className="w-3.5 h-3.5 text-sky-400"/> Suvio AI</div>
                  <div className="text-sm text-white/80">You overspent 22% on restaurants this week. Want me to move ₹2,000 to your savings goal to compensate?</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-32 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-xs uppercase tracking-widest text-sky-400 mb-4">Why Suvio</div>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">Not another productivity app.</h2>
            <p className="mt-4 text-white/60 max-w-2xl mx-auto">An operating system for your life — with a single AI brain that sees every corner.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <div key={i} className="glass rounded-2xl p-8 hover:border-white/10 transition">
                <f.icon className="w-6 h-6 text-sky-400 mb-4" />
                <h3 className="text-xl font-semibold">{f.title}</h3>
                <p className="mt-2 text-white/60">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section id="modules" className="py-32 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-xs uppercase tracking-widest text-sky-400 mb-4">One app, every domain</div>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">Everything that matters. In one place.</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {modules.map((m, i) => (
              <div key={i} className={`glass rounded-2xl p-6 bg-gradient-to-br ${m.color} hover:scale-[1.02] transition`}>
                <m.icon className="w-6 h-6 text-white mb-4" />
                <div className="font-semibold">{m.name}</div>
                <div className="text-xs text-white/50 mt-1">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-32 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-4">
            <div className="text-xs uppercase tracking-widest text-sky-400 mb-4">Simple pricing</div>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">Start free. Grow into the plan that fits.</h2>
            <p className="mt-4 text-white/60 max-w-xl mx-auto">Free Forever, no expiration. Upgrade to Pro, Standard or Premium anytime.</p>
          </div>

          <div className="mt-16 grid md:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {plans.map(plan => (
              <div key={plan.id} className={`relative rounded-2xl p-8 ${plan.highlight ? 'glass-strong border-2 border-sky-500/30 bg-gradient-to-br from-sky-500/5 to-transparent scale-[1.02]' : 'glass'}`} data-testid={`pricing-card-${plan.id}`}>
                {plan.badge && <div className="absolute -top-3 left-6 text-[10px] font-semibold bg-gradient-to-r from-sky-400 to-purple-500 text-black px-2 py-0.5 rounded-full">{plan.badge}</div>}
                <div className="text-sm text-white/60">{plan.name}</div>
                <div className="mt-3 flex items-baseline gap-2">
                  <div className="text-4xl font-semibold tracking-tight">{plan.price}</div>
                  <div className="text-sm text-white/40">{plan.period}</div>
                </div>
                <ul className="mt-6 space-y-2">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-white/80">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5"/>{f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className={`mt-8 block text-center rounded-xl py-3 font-semibold transition ${plan.highlight ? 'bg-gradient-to-r from-sky-400 to-purple-500 text-black hover:opacity-90' : 'bg-white text-black hover:bg-white/90'}`} data-testid={`pricing-cta-${plan.id}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center text-xs text-white/40 max-w-xl mx-auto">
            Prices shown in ₹ INR. Currency auto-adjusts based on your location — USD, EUR, GBP, AUD, CAD, AED, SGD all supported. Payments via Razorpay (UPI, cards, netbanking, wallets).
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <TrendingUp className="w-8 h-8 text-sky-400 mx-auto mb-6" />
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-gradient">Ready to run your life like a startup?</h2>
          <p className="mt-4 text-white/60">Start on Free Forever. Upgrade anytime.</p>
          <Link href="/signup" className="mt-10 inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-xl font-medium hover:bg-white/90 transition glow-sky" data-testid="cta-signup">
            Create your account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-semibold text-center mb-10">Frequently asked</h2>
          <div className="space-y-3">
            {[
              ['Is Free really free forever?', 'Yes. The Free plan never expires. It comes with generous limits for tasks, notes, documents and AI. Upgrade only when you outgrow them.'],
              ['What do I get with Pro / Standard / Premium?', 'Higher limits, more AI, advanced analytics on Standard and above, AI phone reminders on Standard/Premium, and unlimited everything on Premium.'],
              ['Can I cancel my subscription?', 'Yes, anytime. From Settings → Plan & Billing, click Cancel. You keep paid access until the end of your billing period.'],
              ['Do you support UPI and Indian cards?', 'Yes — via Razorpay we accept UPI, credit/debit cards, netbanking, and wallets. INR is our default. Global cards also welcome.'],
              ['Is my data private?', 'Completely. Only you can see your data. AI runs with your context but never trains on it. You can export or delete everything from Settings → Privacy.'],
            ].map(([q,a],i)=>(
              <details key={i} className="glass rounded-xl p-5 group cursor-pointer">
                <summary className="text-sm font-medium flex items-center justify-between list-none">
                  {q}
                  <span className="text-white/40 group-open:rotate-180 transition">▾</span>
                </summary>
                <div className="text-sm text-white/60 mt-3">{a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between gap-6 text-sm text-white/40">
          <div>© 2026 Suvio — The AI OS for life.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Contact</a>
          </div>
        </div>
      </footer>

      <DemoModal open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
}
