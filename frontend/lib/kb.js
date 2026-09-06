// Suvio Help Center knowledge base. Small, hand-written, high-signal.
// The Support AI is grounded on this exact content — it MUST NOT invent
// features that don't exist here. Keep it short and factual.

export const KB_CATEGORIES = [
  { id: 'getting-started', label: 'Getting Started', tone: 'sky' },
  { id: 'auth', label: 'Authentication', tone: 'emerald' },
  { id: 'subscriptions', label: 'Subscriptions & Billing', tone: 'purple' },
  { id: 'ai', label: 'Suvio AI', tone: 'indigo' },
  { id: 'calls', label: 'AI Reminder Calls', tone: 'rose' },
  { id: 'health', label: 'Health & Trainer', tone: 'pink' },
  { id: 'modules', label: 'Modules (Planner, Finance, etc.)', tone: 'amber' },
  { id: 'privacy', label: 'Privacy & Security', tone: 'cyan' },
  { id: 'install', label: 'Installing Suvio', tone: 'green' },
  { id: 'troubleshoot', label: 'Troubleshooting', tone: 'orange' },
];

// Articles are markdown-lite; the Help page renders them safely.
export const KB = [
  {
    slug: 'creating-an-account',
    category: 'getting-started',
    title: 'Creating a Suvio account',
    excerpt: 'Sign up with your phone in under 60 seconds.',
    read: 2,
    body: `Suvio uses a phone-first signup so you never lose access to your account.

**Steps**
1. Open the Sign up page.
2. Enter your **name**, **phone number** (with country code, e.g. +91 98765 43210), and choose a **password** of at least 6 characters.
3. Email is optional — you can skip it or add it later.
4. Tap **Send OTP**. We send a 6-digit code via SMS.
5. Enter the code and tap **Verify & create account**. You're signed in immediately.

**Tips**
- Use a phone number that can receive SMS in your country.
- If you don't receive the code within 60 seconds, tap **Resend**.
- On the dev preview, OTP is fixed to \`000000\`.`,
  },
  {
    slug: 'phone-verification',
    category: 'auth',
    title: 'Phone verification & OTP',
    excerpt: 'How the SMS code flow works.',
    read: 2,
    body: `Suvio sends a one-time password (OTP) via SMS through Twilio Verify.

**When we send an OTP**
- During signup.
- During "Forgot password".
- When you change your phone number in Settings.

**If your OTP doesn't arrive**
1. Confirm the country code (e.g. +91 for India, +1 for US) is correct.
2. Make sure your phone has SMS signal.
3. Wait 30 seconds, then tap **Resend**.
4. Check if your carrier blocks short-code SMS.
5. On a Twilio trial number, only pre-verified numbers can receive SMS.`,
  },
  {
    slug: 'login-methods',
    category: 'auth',
    title: 'Signing in — phone or email',
    excerpt: 'Both phone and email login are supported.',
    read: 1,
    body: `On the Sign in page, switch between the **Phone** and **Email** tabs.

- **Phone**: enter your registered phone number and password.
- **Email**: enter your email and password (only works if you added an email at signup).

Sessions last 30 days. To sign out, click your profile in the sidebar and use the sign-out icon.`,
  },
  {
    slug: 'forgot-password',
    category: 'auth',
    title: 'Resetting your password',
    excerpt: 'Use your phone OTP to set a new password.',
    read: 1,
    body: `1. Tap **Forgot password?** on the sign-in page.
2. Enter your registered phone number.
3. We send you an OTP.
4. Enter the OTP and choose a new password.
5. You're auto-signed-in with the new password.

For security we never confirm whether a phone number is registered — you'll always see "if this number is registered".`,
  },
  {
    slug: 'plans-overview',
    category: 'subscriptions',
    title: 'Plans overview — Free, Pro, Standard, Premium',
    excerpt: 'What each plan unlocks.',
    read: 3,
    body: `Suvio has four plans. Free stays free forever — no trial, no card required.

**Free**
- Up to 20 tasks, 10 notes, 10 AI messages/day.
- Full read-only dashboard & analytics.

**Pro** — ₹299/mo, ₹2,999/yr
- 200 tasks, extended note storage.
- Water reminder AI calls.
- Basic analytics.

**Standard** — ₹599/mo, ₹5,999/yr
- Body analysis, AI workout plans, AI diet plans.
- Up to 100 AI task calls/month.

**Premium** — ₹999/mo, ₹9,999/yr
- Everything unlimited.
- AI meal + workout reminder calls.
- **AI Personal Trainer** with real-time pose detection.
- Concierge support.

Upgrade at any time from **Settings → Upgrade** or the top-bar CTA.`,
  },
  {
    slug: 'payments',
    category: 'subscriptions',
    title: 'How payments work',
    excerpt: 'Razorpay handles all card & UPI payments.',
    read: 2,
    body: `Suvio uses **Razorpay** as its payment processor. We never store your card.

**On successful payment**
1. Razorpay confirms the charge.
2. Suvio verifies the signature server-side.
3. Your plan is upgraded instantly and the new limits apply.

**If a payment fails**
- Your plan doesn't change.
- Retry from the Upgrade page.
- Check your bank for OTP prompts or blocks.

**Cancellation**
- Cancel in Settings → Billing.
- You keep access until the end of the paid period.`,
  },
  {
    slug: 'suvio-ai-overview',
    category: 'ai',
    title: 'What Suvio AI can do',
    excerpt: 'Your Chief of Staff — inside every module.',
    read: 3,
    body: `Suvio AI is a single assistant with context from all your modules (with your consent).

**It can:**
- Add tasks — "Add a task: prepare Q1 report, high priority"
- Log finance — "I spent ₹850 on dinner"
- Log water — "I drank 500ml"
- Update weight — "I gained 2 kg"
- Create trips — "I'm going to Dubai next month"
- Add wardrobe items — "I bought a Nike hoodie"
- Take notes — "Note: pitch deck feedback from investor call"
- Schedule reminder calls — "Call me at 8am tomorrow about the meeting" (Premium plans)
- Toggle recurring reminders — "Remind me every hour to drink water" (Pro+)

**It respects scope.** Suvio AI won't answer general trivia — it stays focused on your Suvio data. Ask "Who won the World Cup" and it politely declines.

**It confirms destructive changes** — deletes always require a "yes" from you.`,
  },
  {
    slug: 'suvio-ai-voice',
    category: 'ai',
    title: 'Using Suvio AI by voice',
    excerpt: 'Tap the mic, speak naturally.',
    read: 2,
    body: `1. Open **Suvio AI** from the sidebar.
2. Tap the **microphone** icon in the input row.
3. Speak naturally in any language your browser's speech engine supports.
4. When you pause, we transcribe and send it.

If we couldn't understand you the first time, we ask you to repeat. If it fails again, we invite you to type instead — no infinite retry loops.

Voice replies can be toggled on/off from the same input row.`,
  },
  {
    slug: 'ai-reminder-calls',
    category: 'calls',
    title: 'AI reminder calls — how they work',
    excerpt: 'Suvio calls your phone at the times you choose.',
    read: 3,
    body: `Suvio can place actual phone calls to you at scheduled times using Twilio.

**Setup**
1. Verify your phone in Settings (mandatory).
2. Turn on the reminder types you want (Reminders page).
3. Suvio queues the calls and dials at the exact minute.

**Types available by plan**
- **Task/general one-off calls** — all paid plans (limits apply).
- **Water reminder calls** — Pro or higher.
- **Meal & workout reminder calls** — Premium only.

**If a call fails**
- Suvio retries once after 2 minutes.
- Every attempt is logged under **AI Calls** in the sidebar.`,
  },
  {
    slug: 'ai-trainer',
    category: 'health',
    title: 'AI Personal Trainer (Premium)',
    excerpt: 'Real-time pose correction with your camera.',
    read: 4,
    body: `The **AI Personal Trainer** watches you through your device camera, counts reps, checks form, and coaches you out loud.

**Requirements**
- Premium plan.
- Chrome, Edge, Safari, or Brave on a device with a camera.
- A well-lit space with enough room to see your full body.

**Getting started**
1. Open **Health → AI Trainer**.
2. Grant camera permission when asked.
3. Choose an exercise (squats supported today; more coming).
4. Follow the on-screen guide — Suvio calls out reps and form cues.
5. End the workout to save a session report with reps, form score, and coaching notes.

**Privacy** — the video **never leaves your device**. Pose detection runs entirely in your browser using MediaPipe. We only save the numeric stats (reps, form score) to your account.`,
  },
  {
    slug: 'health-modules',
    category: 'health',
    title: 'Health module basics',
    excerpt: 'Water, weight, workouts, and diet plans.',
    read: 2,
    body: `The Health module tracks:
- **Water intake** — log a glass with one tap; goal is 2500ml/day by default.
- **Weight** — plot your weight over time.
- **Workout plans** (Standard+) — AI-generated based on your goal + days-per-week.
- **Diet plans** (Standard+) — macros, calorie target, and meal ideas.
- **Body analysis** (Standard+) — upload front/side photos for an AI-estimated summary.

All AI outputs are informational and do not replace professional medical advice.`,
  },
  {
    slug: 'planner',
    category: 'modules',
    title: 'Planner (tasks)',
    excerpt: 'Tasks with priority, due dates, and AI follow-ups.',
    read: 2,
    body: `Create tasks with a title, optional description, due date, and priority (low/medium/high).

- Filter by status, priority, or due window.
- Suvio AI can create/complete/delete tasks by voice or text.
- Enable **Task follow-up calls** in Reminders to have Suvio call you if a task goes overdue.`,
  },
  {
    slug: 'finance',
    category: 'modules',
    title: 'Finance module',
    excerpt: 'Track income and expenses with categories.',
    read: 2,
    body: `Log every transaction as income or expense with a category (food, transport, rent, subscriptions, etc.).

- Dashboard shows month-to-date spend, top category, and a monthly chart.
- Set your currency in Settings.
- Suvio AI can add transactions from natural language ("I spent ₹850 on dinner").`,
  },
  {
    slug: 'privacy',
    category: 'privacy',
    title: 'Privacy at Suvio',
    excerpt: 'What we collect and how it\'s protected.',
    read: 3,
    body: `**What we store**
- Your name, phone (verified), optional email.
- Everything you create in Suvio (tasks, notes, transactions, etc.).
- Optional AI memory items you approve.

**What we NEVER share**
- Your data with third parties for marketing.
- Your data with other Suvio users.

**Trainer video** — pose detection runs 100% on your device. No frames are uploaded.

**Deleting your account** — email support to permanently erase all your data. This is irreversible.`,
  },
  {
    slug: 'install-pwa',
    category: 'install',
    title: 'Installing Suvio on your device',
    excerpt: 'Chrome, Safari, Windows, macOS — all supported.',
    read: 2,
    body: `Suvio installs as a Progressive Web App. No App Store required.

**Android (Chrome/Edge)** — Menu → Install app. Chrome generates a WebAPK so the icon behaves like a native app.

**iPhone/iPad (Safari)** — Share button → Add to Home Screen.

**Desktop (Chrome/Edge/Brave/Arc)** — Look for the install icon in the address bar, or use the menu → Install Suvio.

Full details on the [Download page](/download).`,
  },
  {
    slug: 'otp-not-arriving',
    category: 'troubleshoot',
    title: 'My OTP isn\'t arriving',
    excerpt: 'Step-by-step troubleshooting.',
    read: 2,
    body: `1. **Country code**: make sure your number starts with the country code (e.g. \`+91\` for India, \`+1\` for US). No leading zeros.
2. **Signal**: confirm your phone has cellular reception.
3. **Wait**: SMS can take 30–60 seconds.
4. **Resend**: use the "Resend" button — don't spam it, wait 30s.
5. **Do Not Disturb / block lists**: check that short-code SMS isn't blocked.
6. **Trial numbers**: if you're testing on a preview build with a Twilio trial account, only pre-verified numbers can receive SMS.
7. Still nothing? Use **Contact Support** below with your phone number's country code.`,
  },
  {
    slug: 'ai-not-responding',
    category: 'troubleshoot',
    title: 'Suvio AI isn\'t responding',
    excerpt: 'How to recover if the assistant seems stuck.',
    read: 1,
    body: `1. Check your internet connection.
2. Try again in 10 seconds — the AI provider may be briefly overloaded.
3. Refresh the page. Suvio auto-catches AI errors and shows a Retry button.
4. If it keeps failing, use **Report a bug** — include the exact message you sent.`,
  },
  {
    slug: 'mic-camera-permissions',
    category: 'troubleshoot',
    title: 'Microphone or camera permission denied',
    excerpt: 'How to unblock them in your browser.',
    read: 2,
    body: `**Chrome / Edge / Brave** — click the lock icon in the address bar → Site settings → allow Camera / Microphone → reload.

**Safari** — Safari menu → Settings for This Website → allow Camera / Microphone.

**Mobile** — reset the site permission from your browser settings and reload.

If your browser doesn't support the required API (very old Firefox etc.), Suvio falls back to text input.`,
  },
  {
    slug: 'keyboard-shortcuts',
    category: 'getting-started',
    title: 'Keyboard shortcuts',
    excerpt: 'Move around Suvio without touching the mouse.',
    read: 1,
    body: `**Global**
- \`⌘K\` / \`Ctrl+K\` — open the Command Palette (jump to any module or run an action).
- \`Esc\` — close open dialogs, modals, or the Command Palette.

**Suvio AI**
- \`Enter\` — send message.
- \`Shift+Enter\` — new line in the message.
- Mic button — hold-to-talk on desktop, tap-to-toggle on mobile.

**Sidebar**
- Click the Suvio logo (top left) to toggle the sidebar drawer.

New shortcuts are added regularly — they'll show up in this article as we ship them.`,
  },
  {
    slug: 'notifications-and-reminders',
    category: 'modules',
    title: 'Notifications & reminders',
    excerpt: 'How Suvio nudges you across email, SMS, and phone calls.',
    read: 2,
    body: `Suvio supports three tiers of nudges:

1. **In-app toasts** — instant feedback when you finish an action (free on all plans).
2. **SMS & push notifications** — reminders for scheduled tasks (Pro+).
3. **AI phone calls** — Suvio dials you at the right minute (Pro+ for water, Premium for meal/workout).

Configure everything on the **Reminders** page. You can pause reminders during quiet hours (e.g., 10 PM to 7 AM) and choose the channel per reminder type.`,
  },
  {
    slug: 'data-export',
    category: 'privacy',
    title: 'Exporting your data',
    excerpt: 'Take everything you\'ve tracked with you.',
    read: 2,
    body: `Every Suvio user can request a full data export at any time.

**How to export**
1. Open Settings → Privacy & Data.
2. Tap **Export data** → we generate a ZIP with JSON files for every module (tasks, notes, transactions, health logs, etc.).
3. Download the ZIP within 24 hours (link expires after that).

Your export contains **only your data** — no Suvio internals or other users' information. Use it to move to another tool, keep offline backups, or feed into your own scripts.`,
  },
  {
    slug: 'refund-policy',
    category: 'subscriptions',
    title: 'Refund policy',
    excerpt: 'Honest, prorated refunds via Razorpay.',
    read: 2,
    body: `Suvio believes in honest refunds — no lock-in tricks.

**When you cancel**
1. Open Settings → Plan & Billing → Cancel & get refund.
2. We show a **live refund estimate** based on days used vs remaining, minus a small usage-based adjustment.
3. Confirm → refund is initiated instantly via Razorpay.
4. Money credits back to your original payment method within 5–7 business days.

**Not eligible for refund**
- Free plan (nothing was charged).
- Chargebacks or disputes filed with your bank (those bypass Suvio).
- Accounts terminated for policy violations.

Questions? Contact us via Help Center → Contact.`,
  },
  {
    slug: 'account-security',
    category: 'privacy',
    title: 'Account security tips',
    excerpt: 'Simple habits that keep your account safe.',
    read: 2,
    body: `**Do**
- Use a unique password (not one you use on other sites).
- Keep your phone SIM secured — Suvio uses your number for password resets.
- Sign out of Suvio on shared devices.
- Enable your device's screen lock — Suvio inherits it as your first line of defence.

**Don't**
- Share your OTP with anyone — Suvio staff will *never* ask for it.
- Reuse the same password across services.
- Leave a signed-in tab open in a public library.

If you ever suspect your account is compromised: change your password immediately (Forgot password → phone OTP), then contact us via the Help Center.`,
  },
  {
    slug: 'faq',
    category: 'getting-started',
    title: 'Frequently asked questions',
    excerpt: 'The 15 questions we hear the most.',
    read: 3,
    body: `Suvio's FAQ page has quick answers to the top 15 questions people ask, including:

- Is Suvio free?
- How do I upgrade to Premium?
- Can I cancel any time?
- Where does my data live?
- Which browsers work with the AI Trainer?
- How do I install Suvio like an app?
- How do I delete my account?

Open the [FAQ page](/dashboard/help/faq) for the full list.`,
  },
  {
    slug: 'release-notes',
    category: 'getting-started',
    title: 'Release notes',
    excerpt: 'Every user-facing update, newest first.',
    read: 2,
    body: `Suvio ships user-visible improvements every 3–6 weeks.

The **Release notes** page lists every version we\'ve shipped since V1.0, including:

- New features
- Meaningful bug fixes
- UI refinements
- Deprecations

Open [Release notes](/dashboard/help/release-notes) to see the timeline.`,
  },
  {
    slug: 'troubleshooting-index',
    category: 'troubleshoot',
    title: 'Troubleshooting index',
    excerpt: 'Grouped fixes for the most common issues.',
    read: 2,
    body: `The **Troubleshooting** page is a single place to find "if X, then Y" recipes for:

- OTP not arriving
- Sign-in loops
- Suvio AI stuck / errors
- AI reminder calls not reaching you
- AI Trainer camera issues
- Microphone / voice input
- Payment failures / plan not upgraded
- App install issues
- Network / offline errors

Open [Troubleshooting](/dashboard/help/troubleshooting) for expandable step-by-step fixes.`,
  },
];

/** Simple in-memory search — good enough for a curated corpus. */
export function searchKB(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  return KB.map((a) => {
    const hay = `${a.title} ${a.excerpt} ${a.body} ${a.category}`.toLowerCase();
    let score = 0;
    for (const term of q.split(/\s+/)) {
      if (!term) continue;
      const hits = hay.split(term).length - 1;
      if (a.title.toLowerCase().includes(term)) score += hits * 5;
      else score += hits;
    }
    return { article: a, score };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((r) => r.article);
}

export function findArticle(slug) {
  return KB.find((a) => a.slug === slug) || null;
}
