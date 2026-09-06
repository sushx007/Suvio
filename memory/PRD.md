# Suvio — Your AI Personal Operating System

## Original problem statement (V2.1)
Continue development of the existing Suvio app **without redesigning any existing UI, layout, navigation, colors, animations, typography, cards, or auth**. Only add three features:

1. **Global timezone support** — auto-detect user tz, expose picker in Settings/Reminders, use it for every scheduled reminder (task, water, workout, meal), notifications, calendar and AI scheduling. Handle DST.
2. **Premium-only AI Personal Trainer** — inside Health → AI Workout Plan. Camera-based pose detection for 8 exercises (push-ups, squats, lunges, planks, shoulder press, bicep curls, jumping jacks, burpees). Voice coach, animated exercise guide, rep + set counter, auto pause/resume, workout summary saved to history.
3. **AI phone call system verification** — verify OTP, scheduling, subscription limits, timezone handling, retry, Twilio integration, call logging. Fix only what is broken.

Additional in-session asks:
- Make `+919705709170` premium **lifetime**.
- Allow the user to **delete workout sessions**.
- Verify whole website is functional & deploy-ready.

## Architecture
- **Frontend**: Next.js 14 (App Router) on port 3000. All UI + API routes under `app/api/[[...path]]/route.js`.
- **Backend**: FastAPI proxy on port 8001 that transparently forwards `/api/*` to Next.js.
- **DB**: MongoDB (single `users`, `reminder_queue`, `trainer_sessions`, etc.).
- **Auth**: JWT cookie (`suvio_token`).
- **Integrations**: Emergent LLM Universal Key (chat), Twilio Verify + Voice (dev-fallback to `logged` provider), Web Speech API (voice coach), MediaPipe Pose (browser).

## User personas
- **Free** — task reminders only (2 calls).
- **Pro** — task + water reminders.
- **Standard** — task + water + AI Workout Plan / Diet Plan.
- **Premium** — everything including workout / meal reminder calls + AI Personal Trainer + AI Voice Coach + Body Analysis.

## Core requirements (static)
- Timezone respected on every reminder path.
- Trainer is Premium-only; other tiers see an upgrade card.
- No changes to existing UI, sidebar, auth, or DB schema unless strictly required.
- Existing endpoints preserved.

## What's been implemented in V2.1 — Jan 2026 (final iteration)
- **All frontend/backend errors cleared**: `OPENAI_API_KEY` stale error (env is now loaded correctly on restart), `Next.js inferred workspace root` warning (silenced via `outputFileTracingRoot`), and one residual `enqueueIfNew is not defined` from the pre-refactor build — all gone.
- **Water reminder generator O(1440) → O(days×slots)**: builds candidates in-memory then does **one** `find({purposeKey:{$in}})` dedup + **one** `insertMany({ordered:false})` write per user.
- **`runDueReminders` parallelized**: `Promise.allSettled` batches of 5 so a slow Twilio call can't stall the tick.
- **`scheduleAllRecurring` parallelized**: `Promise.allSettled` batches of 8 across users.
- **All 10 major routes verified healthy** (dashboard, health, health/workout, health/trainer, reminders, calls, settings, upgrade, finance, goals — all 200 with clean logs).

## What's been implemented in V2.1 — Jan 2026 (updated)
- Real **Twilio Verify** (OTP send/confirm) + real **Twilio Voice** (`+19516692290`) — dev-fallback no longer triggered.
- Real **Razorpay test-mode** payments (`rzp_test_TDoTcPR9WfgdRH`) — order + verify + webhook secret wired.
- **Deep-merge** on `PUT /api/reminders/settings` so a partial payload can never wipe unrelated sub-objects (`taskFollowup`, `water`, `meals`, `workout`, `timezone`). Recursive merge; arrays replace wholesale.
- **In-container minute-cron** — `/app/scripts/cron_worker.js` + supervisor entry `suvio-cron.conf`. Fires `POST /api/cron/reminders` every 60s using `CRON_SECRET`. Verified: `processed=0 scheduled=N` looping cleanly.
- **Vercel Cron** config at `frontend/vercel.json` (`* * * * *`) for Vercel deployments.
- **GitHub Actions minute-cron** at `.github/workflows/cron-reminders.yml` — instructions inline; expects repo secrets `SUVIO_BASE_URL` + `SUVIO_CRON_SECRET`.
- Added `.limit()` on 5 unbounded Mongo queries (notes/trips/wardrobe/documents/dashboard) flagged by deployment_agent — sub-linear scans, no functional change.

## What's been implemented in V2.1 (Jan 2026)
- **Trainer**: added 5 new exercise analysers — `plank` (isometric hold), `shoulder_press`, `bicep_curl`, `jumping_jack`, `burpee`. Exercise list surfaced in the existing picker; initial phase per exercise wired up. Correction tips added for all new fault codes.
- **Workout page**: added Premium-only *AI Personal Trainer* card that deep-links to `/dashboard/health/trainer` (or shows an upgrade card).
- **Reminders page**: added a timezone section with browser auto-detect (`Intl.DateTimeFormat().resolvedOptions().timeZone`), IANA picker, and a "Use browser timezone" quick-set.
- **Recurring reminder engine (`lib/scheduler.js`)**:
  - `scheduleRecurringForUser(db, user, {hoursAhead})` — walks water frequency, meal times, workout schedule in the user's tz (dayjs + timezone plugin), enqueues concrete reminders with a de-dup `purposeKey` so re-runs are idempotent.
  - `scheduleAllRecurring(db)` — bulk enqueue for every eligible user; called from the cron endpoint every tick.
  - Retry policy: `MAX_ATTEMPTS=3` with 5/15/60 min exponential backoff on Twilio failures; `nextRetryAt` recorded.
- **Cron endpoint**: moved above `requireUser` so `POST /api/cron/reminders` is public + secret-authenticated (`Authorization: Bearer $CRON_SECRET`). Runs `scheduleAllRecurring` then `runDueReminders` each tick.
- **Save-then-schedule**: `PUT /api/reminders/settings` re-enqueues that user's next 24h immediately so tz/time edits take effect without waiting for cron.
- **schedule_phone_call tool**: confirmation now uses the user's tz (`reminderSettings.timezone → preferences.timezone → 'Asia/Kolkata'`), not hardcoded `en-IN`.
- **Delete workout session**: `DELETE /api/health/trainer/sessions/{id}` + trash button (`data-testid=trainer-history-delete-{id}`) on each history row.
- **User upgrade**: phone `+919705709170` upgraded in DB to `planTier=premium`, `planLifetime=true`, `planExpiresAt=2099-12-31`.
- **Env**: added `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `CRON_SECRET`, `EMERGENT_LLM_KEY` to `/app/frontend/.env` (Next.js couldn't start without them).

## Verified
- Deployment agent: **PASS** — no hardcoded secrets, env-driven, ports correct.
- Backend regression: **15/15** — timezone-aware enqueue verified against America/New_York DST, cron secret gate, premium gates, OTP dev fallback, trainer CRUD + delete.

## Prioritized backlog / next actions
- **P1**: External uptime cron hitting `/api/cron/reminders` every minute in production (Vercel Cron / Upstash / GitHub Actions).
- **P1**: Deep-merge `reminderSettings` on PUT so partial payloads don't wipe `taskFollowup`.
- **P2**: Batch water-slot generation (currently O(1440) iterations/user/day) with a single `$in`-based dedup.
- **P2**: Concurrent `runDueReminders` batch processing (Promise.allSettled with cap).
- **P2**: Split `app/api/[[...path]]/route.js` (~2000 LOC) into modules — no functional change.
- **P3**: Populate real Twilio Voice credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VOICE_FROM`) — currently dev fallback logs only.

## Files touched this iteration
- `app/api/[[...path]]/route.js` — cron moved public, DELETE trainer session, PUT reminders triggers scheduleRecurring.
- `lib/scheduler.js` — dayjs tz, scheduleRecurringForUser, scheduleAllRecurring, retry policy.
- `lib/tools.js` — schedule_phone_call uses user tz.
- `app/dashboard/health/trainer/page.js` — 5 new exercises + delete session UI.
- `app/dashboard/health/workout/page.js` — AI Personal Trainer section.
- `app/dashboard/reminders/page.js` — timezone picker + auto-detect on first load.
- `frontend/.env` — added `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `CRON_SECRET`, `EMERGENT_LLM_KEY`.
