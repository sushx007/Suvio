'use client';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Zap, Bug, Rocket } from 'lucide-react';

// Suvio Release Notes — hand-curated, newest first. Update this file
// with every user-facing release so the Help Center stays truthful.

const RELEASES = [
  {
    version: 'V1.6',
    date: 'January 2026',
    tone: 'sky',
    icon: Sparkles,
    title: 'Help Center Expansion & Trainer',
    highlights: [
      'AI Personal Trainer (Premium) — MediaPipe camera, live voice coaching, rep counter for squats.',
      'Help Center rebuild — searchable KB, quick action cards, floating Support Widget on every dashboard page.',
      'Bug reports, feature requests, and feedback all captured and reviewed by the team.',
      'Sidebar refinement — the account row now opens Settings directly (no separate gear icon).',
    ],
  },
  {
    version: 'V1.5',
    date: 'December 2025',
    tone: 'purple',
    icon: Rocket,
    title: 'AI Reminder Calls & Premium tier',
    highlights: [
      'Premium plan launched — AI meal / workout reminder calls, unlimited AI, concierge support.',
      'Water reminders (Pro+) — Suvio calls your phone at hourly intervals to nudge you to drink.',
      'Refund estimator — cancel anytime and get an honest, prorated refund.',
      'Billing history in Settings → Plan & Billing.',
    ],
  },
  {
    version: 'V1.4',
    date: 'November 2025',
    tone: 'emerald',
    icon: Zap,
    title: 'Phone-first authentication',
    highlights: [
      'Signup and login are now phone-first with SMS OTP via Twilio Verify.',
      'Email is optional and can be added later in Settings.',
      'Forgot-password flow now uses phone OTP instead of an email link.',
      'Google Sign-In deprecated to keep every account tied to a verified phone.',
    ],
  },
  {
    version: 'V1.3',
    date: 'October 2025',
    tone: 'amber',
    icon: Sparkles,
    title: 'Full-canvas sidebar & Command Palette',
    highlights: [
      'Sidebar is now a slide-out drawer — the app has more room by default.',
      'Command Palette (⌘K / Ctrl+K) — jump between modules and run actions instantly.',
      'Preferences engine — theme, accent color, currency, language, timezone, date format sync everywhere.',
      '8 themes: Midnight, Ocean, Emerald, Royal, Sunset, Rose, Graphite, Snow.',
    ],
  },
  {
    version: 'V1.2',
    date: 'September 2025',
    tone: 'rose',
    icon: Bug,
    title: 'Wardrobe, Travel, Achievements',
    highlights: [
      'Wardrobe module — track clothing, favorite colors, outfit suggestions.',
      'Travel module — plan trips, save flight details, packing lists.',
      'Achievements — unlock streaks and badges as you use Suvio.',
      'Fixed 24 UX and layout bugs reported in V1.1.',
    ],
  },
  {
    version: 'V1.1',
    date: 'August 2025',
    tone: 'indigo',
    icon: Rocket,
    title: 'Modules & Analytics',
    highlights: [
      'Finance, Health, Notes, Documents, Planner, Goals modules.',
      'Dashboard analytics — month-to-date spend, water goal, task completion.',
      'AI Memory (opt-in) — Suvio AI remembers facts you tell it.',
    ],
  },
  {
    version: 'V1.0',
    date: 'July 2025',
    tone: 'cyan',
    icon: Sparkles,
    title: 'Suvio launches',
    highlights: [
      'Suvio AI — a single assistant grounded on your Suvio data, refuses to answer general trivia.',
      'Tasks, notes, calls, and a beautifully premium UI.',
      'PWA install support on Android, iOS, macOS, Windows.',
    ],
  },
];

export default function ReleaseNotesPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Link
        href="/dashboard/help"
        className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition mb-6"
        data-testid="release-notes-back"
      >
        <ArrowLeft className="w-4 h-4" /> Help Center
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-400 to-purple-500 grid place-items-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold">Release notes</h1>
          <p className="text-sm text-white/50">Every user-facing update to Suvio — newest first.</p>
        </div>
      </div>

      <div className="mt-10 relative">
        {/* Timeline spine */}
        <div className="absolute left-4 md:left-5 top-2 bottom-2 w-px bg-white/10" aria-hidden />

        <div className="space-y-8">
          {RELEASES.map((r) => {
            const Icon = r.icon;
            return (
              <article
                key={r.version}
                className="relative pl-12 md:pl-14"
                data-testid={`release-${r.version.toLowerCase()}`}
              >
                <div
                  className={`absolute left-0 top-1 w-9 h-9 md:w-10 md:h-10 rounded-xl grid place-items-center border bg-${r.tone}-500/15 border-${r.tone}-500/40`}
                >
                  <Icon className={`w-4 h-4 md:w-5 md:h-5 text-${r.tone}-300`} />
                </div>

                <div className="flex flex-wrap items-baseline gap-2 mb-2">
                  <span className="text-lg font-semibold">{r.title}</span>
                  <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border bg-${r.tone}-500/10 border-${r.tone}-500/40 text-${r.tone}-300`}>
                    {r.version}
                  </span>
                  <span className="text-xs text-white/40">{r.date}</span>
                </div>

                <ul className="space-y-1.5 text-sm text-white/75">
                  {r.highlights.map((h, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-white/30 mt-0.5">•</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mt-16 rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 to-purple-500/5 p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-400 to-purple-500 grid place-items-center">
          <Rocket className="w-5 h-5 text-black" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Have an idea for the next release?</div>
          <div className="text-sm text-white/60">Every feature request is read by our team — the popular ones ship.</div>
        </div>
        <Link
          href="/dashboard/help/contact?tab=feature"
          className="text-sm accent-bg rounded-lg px-4 py-2 font-semibold hover:opacity-90 transition"
          data-testid="release-notes-feature-cta"
        >
          Request a feature
        </Link>
      </div>
    </div>
  );
}
