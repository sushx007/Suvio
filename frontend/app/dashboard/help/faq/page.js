'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, HelpCircle, ChevronDown, Search } from 'lucide-react';

// Suvio FAQ — a compact list of questions that come up 80% of the time.
// Deeper docs live in the KB (searched from the Help Center home).

const FAQS = [
  {
    q: 'Is Suvio free?',
    a: `Yes — the Free plan is permanently free, no card required. It includes 20 tasks, 10 notes, and 10 AI messages per day. Paid tiers (Pro, Standard, Premium) unlock higher limits, AI reminder calls, and the AI Personal Trainer.`,
    tags: ['pricing', 'free', 'plan'],
  },
  {
    q: 'How do I upgrade to Premium?',
    a: `Open Settings → Plan & Billing (or tap the "Upgrade Suvio" button in the top bar). Choose Monthly or Yearly, then pay via Razorpay (cards, UPI, netbanking). Your plan upgrades the moment the payment is verified.`,
    tags: ['upgrade', 'premium', 'razorpay', 'payment'],
  },
  {
    q: 'Can I cancel any time?',
    a: `Yes. Go to Settings → Plan & Billing → Cancel & get refund. You'll see an honest, prorated refund estimate based on how much of your plan is unused, and the refund is initiated instantly via Razorpay.`,
    tags: ['cancel', 'refund', 'billing'],
  },
  {
    q: "My OTP isn't arriving — what do I do?",
    a: `Check the country code, wait 60 seconds, then tap Resend. On preview builds, OTP is fixed to 000000. Detailed steps live on the Troubleshooting page under "OTP not arriving on my phone".`,
    tags: ['otp', 'sms', 'signup', 'login'],
  },
  {
    q: 'Where does my data live?',
    a: `Suvio uses MongoDB hosted in secure datacenters. All content is private to you by default. AI Trainer video never leaves your device. See the Privacy article for full details.`,
    tags: ['privacy', 'data', 'security'],
  },
  {
    q: 'Does Suvio AI answer general questions?',
    a: `No — Suvio AI stays focused on your Suvio data (tasks, finance, health, wardrobe, travel, notes). If you ask "who won the World Cup", it will politely decline. This keeps it fast, cheap, and grounded.`,
    tags: ['ai', 'scope', 'assistant'],
  },
  {
    q: 'Can Suvio actually call my phone?',
    a: `Yes. On paid plans, Suvio schedules real phone calls via Twilio for water reminders (Pro+), meal/workout reminders (Premium), and overdue task follow-ups. Every call is logged in Sidebar → AI Calls.`,
    tags: ['calls', 'reminders', 'twilio'],
  },
  {
    q: 'Which browsers work with the AI Trainer?',
    a: `Chrome, Edge, Brave, and Safari. The pose detection uses MediaPipe which needs the modern WebAssembly runtime — Firefox doesn't fully ship this today. Camera permission is required.`,
    tags: ['trainer', 'camera', 'browser'],
  },
  {
    q: 'Can I install Suvio like an app?',
    a: `Yes — Suvio is a Progressive Web App. On Android/desktop, use the browser's "Install app" menu. On iOS, Safari → Share → Add to Home Screen. See the Download page for full instructions.`,
    tags: ['install', 'pwa', 'app'],
  },
  {
    q: 'What languages does Suvio support?',
    a: `The UI is currently English. Suvio AI responds in the language you write in. Voice input uses your browser's speech engine which supports 50+ languages with automatic detection.`,
    tags: ['language', 'i18n', 'voice'],
  },
  {
    q: 'How do I delete my account?',
    a: `Open Help Center → Contact and file a request under "Feedback" saying you want to delete your account. We erase all data within 7 days. This is irreversible.`,
    tags: ['delete', 'account', 'privacy'],
  },
  {
    q: 'Do I need to be online?',
    a: `Suvio needs a network connection for AI, payments, and syncing. The AI Trainer's pose detection runs entirely on your device once loaded. If you're offline, Suvio shows a friendly offline screen.`,
    tags: ['offline', 'network', 'pwa'],
  },
  {
    q: 'Where do I report a bug?',
    a: `Help Center → Contact → Bug tab. Include the exact steps and what you expected. Every bug is triaged within 24 hours on business days.`,
    tags: ['bug', 'support', 'contact'],
  },
  {
    q: 'Where can I request a feature?',
    a: `Help Center → Contact → Feature tab. Add why you want the feature — the "why" is the strongest signal for prioritization.`,
    tags: ['feature', 'request', 'roadmap'],
  },
  {
    q: 'How often is Suvio updated?',
    a: `We ship user-visible improvements roughly every 3-6 weeks. See the Release notes page for a complete history.`,
    tags: ['releases', 'updates', 'roadmap'],
  },
];

export default function FAQPage() {
  const [openIdx, setOpenIdx] = useState(0);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return FAQS;
    return FAQS.filter(({ q: question, a, tags }) => {
      const hay = `${question} ${a} ${tags.join(' ')}`.toLowerCase();
      return query.split(/\s+/).every((t) => hay.includes(t));
    });
  }, [q]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Link
        href="/dashboard/help"
        className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition mb-6"
        data-testid="faq-back"
      >
        <ArrowLeft className="w-4 h-4" /> Help Center
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-sky-500 grid place-items-center">
          <HelpCircle className="w-5 h-5 text-black" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold">Frequently asked questions</h1>
          <p className="text-sm text-white/50">The 15 questions we hear the most — with quick answers.</p>
        </div>
      </div>

      <div className="mt-6 relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the FAQ…"
          className="w-full pl-9 pr-3 py-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:accent-border"
          data-testid="faq-search"
        />
      </div>

      <div className="mt-6 space-y-2">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-white/10 p-6 text-center text-sm text-white/60" data-testid="faq-empty">
            No results. Try{' '}
            <Link href="/dashboard/help" className="accent-text hover:underline">
              searching the full Help Center
            </Link>{' '}
            or{' '}
            <Link href="/dashboard/help/contact" className="accent-text hover:underline">
              contact support
            </Link>
            .
          </div>
        )}
        {filtered.map((item, i) => {
          const open = openIdx === i;
          return (
            <div key={item.q} className="rounded-xl border border-white/10 glass-strong overflow-hidden" data-testid={`faq-item-${i}`}>
              <button
                type="button"
                onClick={() => setOpenIdx(open ? -1 : i)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/5 transition"
                aria-expanded={open}
              >
                <span className="flex-1 font-medium text-sm">{item.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-white/50 transition-transform ${open ? 'rotate-180' : ''}`}
                />
              </button>
              {open && (
                <div className="px-4 pb-4 pt-1 text-sm text-white/75 border-t border-white/5">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-12 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-sky-500/5 p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-sky-500 grid place-items-center">
          <HelpCircle className="w-5 h-5 text-black" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Didn\'t find your answer?</div>
          <div className="text-sm text-white/60">Search the deeper Knowledge Base or file a support ticket.</div>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/help" className="text-sm border border-white/15 hover:bg-white/5 rounded-lg px-3.5 py-2 transition">Help Center</Link>
          <Link href="/dashboard/help/contact" className="text-sm bg-white text-black rounded-lg px-3.5 py-2 font-semibold hover:opacity-90 transition" data-testid="faq-contact">Contact</Link>
        </div>
      </div>
    </div>
  );
}
