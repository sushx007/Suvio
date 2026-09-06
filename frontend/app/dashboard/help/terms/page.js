'use client';
import Link from 'next/link';
import { ArrowLeft, ScrollText, Mail } from 'lucide-react';

// Suvio Terms of Service — human-readable, not legalese. If your legal
// team gives you a fully-drafted ToS, replace SECTIONS below.

const SECTIONS = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    body: `By creating a Suvio account or using any part of the Suvio service (the "Service"), you agree to be bound by these Terms of Service and our Privacy Policy. If you don't agree, please stop using Suvio.

These terms apply to the web app, the installed PWA, all API endpoints, and any Suvio-generated content or AI responses.`,
  },
  {
    id: 'eligibility',
    title: '2. Eligibility',
    body: `You must be at least 13 years old to use Suvio (16 in the EU/UK). If you're a minor, a parent or guardian must accept these terms on your behalf.

You must provide accurate account information and keep it up to date. You are responsible for anything that happens under your account.`,
  },
  {
    id: 'account',
    title: '3. Your account & security',
    body: `Suvio accounts are phone-verified. You are responsible for keeping your password confidential and for all activity that occurs under your account.

Report any unauthorized access to us immediately via the Help Center → Contact page. We may suspend or terminate accounts that show clear signs of abuse, fraud, or breach of these terms.`,
  },
  {
    id: 'subscriptions',
    title: '4. Subscriptions, billing & refunds',
    body: `Suvio offers a permanently free tier, and paid tiers (Pro, Standard, Premium) billed monthly or annually via Razorpay.

- Paid features unlock only after Razorpay confirms your payment and Suvio verifies the signature server-side.
- You can cancel at any time in Settings → Plan & Billing. You keep access until the end of your paid period.
- **Refunds**: Suvio offers a fair, prorated refund on cancellation. Refunds are typically credited back to your original payment method within 5–7 business days.
- Prices, tiers, and features may change with 30-days notice via in-app notification.`,
  },
  {
    id: 'ai',
    title: '5. Suvio AI',
    body: `Suvio AI is an assistant grounded on your Suvio data (with your consent) and public knowledge. It is provided **as-is**, may make mistakes, and should not be relied on for medical, legal, financial, or safety-critical decisions.

Suvio AI outputs are informational. Always verify important actions before you act on them. AI-generated workout, diet, and health plans are informational and do not replace professional medical advice.`,
  },
  {
    id: 'acceptable',
    title: '6. Acceptable use',
    body: `You agree not to:

- Reverse engineer, decompile, or attempt to extract Suvio\'s source code.
- Abuse rate limits, scrape data, or overload our infrastructure.
- Use Suvio to store or distribute illegal, harassing, or infringing content.
- Impersonate another user or misrepresent your identity.
- Attempt to bypass paid feature gates.

We reserve the right to suspend accounts that violate these rules.`,
  },
  {
    id: 'content',
    title: '7. Your content',
    body: `You retain ownership of everything you create in Suvio — tasks, notes, transactions, uploaded documents, wardrobe photos, etc.

You grant Suvio a limited license to store, process, and display your content solely for the purpose of operating the Service (e.g., letting Suvio AI answer questions about your data).

We never sell your content or use it to train third-party models without your explicit consent.`,
  },
  {
    id: 'privacy',
    title: '8. Privacy',
    body: `Your privacy is documented in our Privacy Policy at /dashboard/help/privacy. In short:

- All content is private to you by default.
- AI Trainer video never leaves your device.
- We use trusted vendors (Razorpay, Twilio) that are contractually bound to protect your data.
- You can request deletion of your account and all associated data at any time.`,
  },
  {
    id: 'termination',
    title: '9. Termination',
    body: `You can delete your Suvio account at any time via the Contact page. Deletion is permanent and cannot be undone.

We may terminate or suspend your access without notice if you materially breach these terms, engage in fraudulent payments, or use Suvio in a way that endangers other users or the service.`,
  },
  {
    id: 'warranty',
    title: '10. Warranty disclaimer',
    body: `Suvio is provided **as-is** and **as-available** without warranties of any kind, express or implied. We do not warrant that the Service will be uninterrupted, error-free, or perfectly accurate.

You use Suvio at your own risk. Nothing in the Service constitutes medical, legal, financial, or professional advice.`,
  },
  {
    id: 'liability',
    title: '11. Limitation of liability',
    body: `To the maximum extent permitted by law, Suvio and its affiliates are not liable for any indirect, incidental, consequential, or punitive damages, including loss of data, revenue, or business.

Our total aggregate liability to you is limited to the amount you paid Suvio in the 12 months preceding the claim, or ₹5,000 if you\'re on the free plan.`,
  },
  {
    id: 'changes',
    title: '12. Changes to these terms',
    body: `We may update these terms as Suvio evolves. Material changes will be announced via in-app notification and email (if you provided one) at least 30 days before they take effect.

Continued use of the Service after changes take effect means you accept the new terms.`,
  },
  {
    id: 'contact',
    title: '13. Contact',
    body: `Questions about these terms? Reach us via the Help Center → Contact page, or email support@suvio.app.

These terms are governed by the laws of India. Any disputes will be resolved in the courts of Bengaluru, India, unless applicable local law requires otherwise.`,
  },
];

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Link
        href="/dashboard/help"
        className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition mb-6"
        data-testid="terms-back"
      >
        <ArrowLeft className="w-4 h-4" /> Help Center
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 grid place-items-center">
          <ScrollText className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold">Terms of Service</h1>
          <p className="text-sm text-white/50">Effective January 2026 · v1.6</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 glass-strong p-5 text-sm text-white/60">
        These terms are written in plain English wherever possible. If any clause is unclear, ask us on the{' '}
        <Link href="/dashboard/help/contact" className="accent-text hover:underline">
          Contact page
        </Link>{' '}
        — we\'d rather explain than argue.
      </div>

      {/* Table of contents */}
      <nav className="mt-6 rounded-2xl border border-white/10 p-4" data-testid="terms-toc">
        <div className="text-xs uppercase tracking-widest text-white/40 mb-2">Table of contents</div>
        <ol className="grid gap-1 sm:grid-cols-2 text-sm">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-white/70 hover:text-white transition hover:underline">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-8 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-24" data-testid={`terms-section-${s.id}`}>
            <h2 className="text-lg font-semibold mb-2">{s.title}</h2>
            <div className="text-sm text-white/75 whitespace-pre-wrap leading-relaxed">{renderInline(s.body)}</div>
          </section>
        ))}
      </div>

      <div className="mt-16 rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 grid place-items-center">
          <Mail className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Have a legal question?</div>
          <div className="text-sm text-white/60">Reach the Suvio team directly — we\'ll respond within 2 business days.</div>
        </div>
        <Link
          href="/dashboard/help/contact"
          className="text-sm bg-white text-black rounded-lg px-4 py-2 font-semibold hover:opacity-90 transition"
          data-testid="terms-contact"
        >
          Contact
        </Link>
      </div>
    </div>
  );
}

function renderInline(text) {
  // Split on **bold**, `code`, and preserve newlines by splitting further.
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) return <b key={i}>{p.slice(2, -2)}</b>;
    if (/^`[^`]+`$/.test(p)) return <code key={i} className="bg-white/10 rounded px-1 text-[12px] font-mono">{p.slice(1, -1)}</code>;
    return <span key={i}>{p}</span>;
  });
}
