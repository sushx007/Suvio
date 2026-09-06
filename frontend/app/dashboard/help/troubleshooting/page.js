'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Wrench, ChevronDown, ChevronRight, Bug, Signal, KeyRound, Camera, Mic, Bell, CreditCard, Smartphone } from 'lucide-react';

// Suvio Troubleshooting Center — grouped, expandable "if X, then Y" flows.
// Each recipe MUST end with a concrete action (button or article link) so
// users can escape the tunnel.

const RECIPES = [
  {
    id: 'otp',
    icon: KeyRound,
    tone: 'emerald',
    question: "OTP not arriving on my phone",
    steps: [
      'Confirm the country code (e.g. +91 for India, +1 for US). Remove any leading zeros.',
      'Wait up to 60 seconds — SMS routing can be slow.',
      'Check that your phone has signal and SMS isn\'t muted/blocked.',
      'Tap **Resend** on the OTP screen (do not tap it repeatedly — rate limits apply).',
      'On preview builds we use a fixed dev OTP: `000000`.',
      'On a Twilio trial number, only pre-verified phone numbers can receive SMS.',
    ],
    cta: { label: 'Read full OTP article', href: '/dashboard/help/otp-not-arriving' },
  },
  {
    id: 'login',
    icon: KeyRound,
    tone: 'sky',
    question: "I can't sign in — wrong password / loop after OTP",
    steps: [
      'Double-check whether you\'re using the **Phone** tab or **Email** tab.',
      'Email login only works if you added an email at signup (or later in Settings).',
      'Password is case-sensitive. Watch for auto-capitalized first letters on mobile.',
      'Still stuck? Use **Forgot password** — the phone OTP resets your password.',
      'If you land back on the login page immediately, your session cookie may be blocked (private browsing on iOS Safari). Try a normal window.',
    ],
    cta: { label: 'Reset password', href: '/forgot' },
  },
  {
    id: 'ai',
    icon: Bug,
    tone: 'purple',
    question: 'Suvio AI is stuck or shows an error',
    steps: [
      'Wait 10 seconds and try again — the AI provider may be briefly rate-limited.',
      'Refresh the page. The AI page has an auto-recovery **Retry** button.',
      'Check the network tab in DevTools — a 401 usually means your session expired. Sign in again.',
      'Free plan has a daily AI message cap (10/day). Upgrade to Pro or higher for more.',
      'If nothing works, use **Report a bug** with the exact message you sent.',
    ],
    cta: { label: 'Open Suvio AI', href: '/dashboard/ai' },
  },
  {
    id: 'calls',
    icon: Bell,
    tone: 'rose',
    question: "AI reminder calls aren't reaching me",
    steps: [
      'Confirm your phone is verified in Settings — a green tick appears next to your number.',
      'Check the reminder is enabled on **Dashboard → Reminders** (not just saved).',
      'Verify the type is allowed on your plan: water = Pro+, meal/workout = Premium only.',
      'Some carriers silently block calls from international numbers on the first attempt — Suvio auto-retries once after 2 minutes.',
      'Every attempt is logged under **AI Calls** — a "failed" row will show the reason.',
    ],
    cta: { label: 'AI Calls log', href: '/dashboard/calls' },
  },
  {
    id: 'trainer',
    icon: Camera,
    tone: 'pink',
    question: 'AI Trainer camera or pose detection not working',
    steps: [
      'AI Trainer requires the **Premium** plan. Check your tier in Settings → Plan & Billing.',
      'Grant camera permission when your browser prompts. On Chrome/Edge, click the lock icon → Site settings → Camera → Allow.',
      'Use Chrome, Edge, Safari, or Brave — Firefox doesn\'t currently ship the pose detection API Suvio uses.',
      'Stand 2m away so your whole body is visible in the frame. Good lighting matters more than resolution.',
      'If reps aren\'t counting, verify the on-screen skeleton is drawn on your body — that means detection is active.',
    ],
    cta: { label: 'Open AI Trainer', href: '/dashboard/health/trainer' },
  },
  {
    id: 'mic',
    icon: Mic,
    tone: 'amber',
    question: 'Microphone / voice input not working',
    steps: [
      'Grant microphone permission on the site (browser lock icon → Site settings → Microphone → Allow).',
      'Speech recognition is a browser API — Safari on iOS supports it, Firefox does not.',
      'If it captures gibberish, check that the correct system input device is selected (macOS: System Settings → Sound → Input).',
      'On mobile, some external mics disable the built-in mic silently — unplug and retry.',
    ],
    cta: { label: 'Permissions article', href: '/dashboard/help/mic-camera-permissions' },
  },
  {
    id: 'payment',
    icon: CreditCard,
    tone: 'indigo',
    question: 'Payment failed / plan not upgraded after payment',
    steps: [
      'Check your bank app — sometimes a 3-D-Secure OTP is required and the app times out.',
      'If the money left your account but your plan didn\'t upgrade, wait 60 seconds — the Razorpay webhook may still be arriving.',
      'Refresh the app. Open Settings → Plan & Billing to see the latest tier and payment status.',
      'If it\'s been more than 5 minutes and your plan is still Free, use **Report a bug** with the Razorpay reference ID from your SMS/email.',
      'We never charge you twice — Razorpay + Suvio\'s server both validate the order.',
    ],
    cta: { label: 'View billing history', href: '/dashboard/settings' },
  },
  {
    id: 'pwa',
    icon: Smartphone,
    tone: 'green',
    question: 'App won\'t install / update on my phone',
    steps: [
      'Android/Chrome: menu → **Install app** (or "Add to home screen"). If missing, open in Chrome, not a WebView.',
      'iPhone Safari: **Share** → **Add to Home Screen**. In-app browsers (Instagram, Twitter) don\'t support install.',
      'Desktop: look for the install icon in the address bar. Chrome, Edge, Brave and Arc all support it.',
      'To force update: reload the page, then close and reopen the installed app.',
    ],
    cta: { label: 'Download page', href: '/download' },
  },
  {
    id: 'network',
    icon: Signal,
    tone: 'cyan',
    question: 'Offline / connection errors',
    steps: [
      'Suvio needs a network connection for AI, calls, and data sync. Local pose detection runs offline once loaded.',
      'If your network is throttled (school/office Wi-Fi), try mobile data.',
      'A red toast that says "Failed to fetch" usually means the browser blocked the request — check ad blockers and privacy extensions.',
      'When offline, Suvio shows a friendly offline page and queues nothing (to avoid data drift).',
    ],
    cta: { label: 'System status', href: '/dashboard/help/status' },
  },
];

export default function TroubleshootingPage() {
  const [openId, setOpenId] = useState(null);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Link
        href="/dashboard/help"
        className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition mb-6"
        data-testid="troubleshoot-back"
      >
        <ArrowLeft className="w-4 h-4" /> Help Center
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 grid place-items-center">
          <Wrench className="w-5 h-5 text-black" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold">Troubleshooting</h1>
          <p className="text-sm text-white/50">Fixes for the issues we hear about most. Tap a topic to expand.</p>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {RECIPES.map((r) => {
          const open = openId === r.id;
          const Icon = r.icon;
          return (
            <div
              key={r.id}
              className="rounded-2xl border border-white/10 glass-strong overflow-hidden"
              data-testid={`troubleshoot-item-${r.id}`}
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : r.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/5 transition"
                aria-expanded={open}
                data-testid={`troubleshoot-toggle-${r.id}`}
              >
                <div className={`w-9 h-9 rounded-lg bg-${r.tone}-500/15 border border-${r.tone}-500/30 grid place-items-center shrink-0`}>
                  <Icon className={`w-4 h-4 text-${r.tone}-300`} />
                </div>
                <div className="flex-1 font-medium text-sm md:text-base">{r.question}</div>
                {open ? <ChevronDown className="w-4 h-4 text-white/50" /> : <ChevronRight className="w-4 h-4 text-white/50" />}
              </button>
              {open && (
                <div className="px-4 pb-4 pl-16 border-t border-white/5 pt-3 text-sm">
                  <ol className="space-y-2 list-decimal ml-4 text-white/75">
                    {r.steps.map((s, i) => (
                      <li key={i}>{renderInline(s)}</li>
                    ))}
                  </ol>
                  {r.cta && (
                    <Link
                      href={r.cta.href}
                      className="mt-4 inline-flex items-center gap-2 accent-bg rounded-lg px-3.5 py-1.5 text-xs font-semibold hover:opacity-90 transition"
                      data-testid={`troubleshoot-cta-${r.id}`}
                    >
                      {r.cta.label} →
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-10 rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-amber-500/5 p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-400 to-amber-400 grid place-items-center">
          <Bug className="w-5 h-5 text-black" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Still stuck?</div>
          <div className="text-sm text-white/60">If none of these recipes solve it, file a bug — we read every one within 24 hours.</div>
        </div>
        <Link
          href="/dashboard/help/contact"
          className="text-sm bg-white text-black rounded-lg px-4 py-2 font-semibold hover:opacity-90 transition"
          data-testid="troubleshoot-contact"
        >
          Contact support
        </Link>
      </div>
    </div>
  );
}

// Tiny inline renderer for **bold** and `code`, no dependencies.
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) return <b key={i}>{p.slice(2, -2)}</b>;
    if (/^`[^`]+`$/.test(p)) return <code key={i} className="bg-white/10 rounded px-1 text-[12px] font-mono">{p.slice(1, -1)}</code>;
    return <span key={i}>{p}</span>;
  });
}
