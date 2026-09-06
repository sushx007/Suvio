// Reusable reminder scheduler.
//
// The scheduler is intentionally stateless and pull-based: any reminder
// worker (a cron job on the deployment side, or a hosted worker like
// Vercel Cron / Upstash QStash) hits `runDueReminders(db)` on a short
// interval. This keeps the app runtime free of long-lived timers and
// makes the design portable across serverless deployments.
//
// Reminder shape (stored in `reminder_queue`):
//   {
//     id, userId, type: 'task'|'water'|'meal'|'workout'|'task_followup',
//     scheduledFor: Date,
//     status: 'pending'|'sent'|'failed'|'cancelled',
//     meta: { taskId?, message?, phone?, kind? },
//     createdAt, updatedAt,
//     nextRetryAt?: Date,
//     attempts: 0,
//   }

import { v4 as uuid } from 'uuid';
import { placeVoiceCall } from './voice';
import { consumeCallSlot, callLimitFor, getTier, tierAllows } from './plan';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import tzPlugin from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(tzPlugin);

const MAX_ATTEMPTS = 3;
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export async function enqueueReminder(db, { userId, type, scheduledFor, meta = {} }) {
  const doc = {
    id: uuid(),
    userId,
    type,
    scheduledFor: new Date(scheduledFor),
    status: 'pending',
    meta,
    attempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await db.collection('reminder_queue').insertOne(doc);
  return doc;
}

export async function cancelReminder(db, { id, userId }) {
  await db.collection('reminder_queue').updateOne(
    { id, userId, status: 'pending' },
    { $set: { status: 'cancelled', updatedAt: new Date() } },
  );
}

// Map reminder-type -> call-limit key on the user plan.
const CALL_KEY_FOR = {
  task: 'taskReminderCallsPerMonth',
  task_followup: 'taskReminderCallsPerMonth',
  water: 'waterReminderCallsPerMonth', // Pro+; not enforced as a hard cap
  meal: 'mealReminderCallsPerMonth',
  workout: 'workoutReminderCallsPerMonth',
};

const FEATURE_FOR = {
  water: 'waterReminderCalls',
  meal: 'mealReminderCalls',
  workout: 'workoutReminderCalls',
};

// Called by the worker for each pending reminder that's due.
export async function processReminder(db, reminder) {
  const user = await db.collection('users').findOne({ id: reminder.userId });
  if (!user) {
    await db.collection('reminder_queue').updateOne(
      { id: reminder.id },
      { $set: { status: 'failed', error: 'user_missing', updatedAt: new Date() } },
    );
    return { ok: false, reason: 'user_missing' };
  }
  const tier = getTier(user);
  const feature = FEATURE_FOR[reminder.type];
  if (feature && !tierAllows(tier, feature)) {
    await db.collection('reminder_queue').updateOne(
      { id: reminder.id },
      { $set: { status: 'skipped', error: 'not_in_plan', updatedAt: new Date() } },
    );
    return { ok: false, reason: 'not_in_plan' };
  }

  // Task reminders are the only counter we enforce here — other reminder
  // types are gated purely by plan tier.
  if (reminder.type === 'task' || reminder.type === 'task_followup') {
    const slot = await consumeCallSlot(db, user, 'taskReminderCallsPerMonth');
    if (!slot.allowed) {
      await db.collection('reminder_queue').updateOne(
        { id: reminder.id },
        { $set: { status: 'skipped', error: 'monthly_limit', updatedAt: new Date() } },
      );
      // Notification: create an in-app notification so the user knows.
      await db.collection('notifications').insertOne({
        id: uuid(),
        userId: user.id,
        kind: 'limit_reached',
        title: 'AI reminder call limit reached',
        body: `You've used all ${slot.limit} AI phone reminder calls for this month. Upgrade to keep the calls flowing.`,
        createdAt: new Date(),
        read: false,
      });
      return { ok: false, reason: 'monthly_limit' };
    }
  }

  const to = user.phone;
  if (!to) {
    await db.collection('reminder_queue').updateOne(
      { id: reminder.id },
      { $set: { status: 'failed', error: 'no_phone', updatedAt: new Date() } },
    );
    return { ok: false, reason: 'no_phone' };
  }

  const message = reminder.meta?.message || 'Hello! This is Suvio AI. This is your scheduled reminder.';
  const result = await placeVoiceCall({ to, message });

  const attempts = (reminder.attempts || 0) + 1;
  // Retry policy: on failure, requeue with exponential backoff up to MAX_ATTEMPTS
  // (5min, 15min, 60min). A logged_only "success" (no telephony provider
  // configured) is treated as sent so the call still shows up in history.
  const success = result.ok;
  const shouldRetry = !success && attempts < MAX_ATTEMPTS;
  const backoffMin = [5, 15, 60][Math.min(attempts - 1, 2)] || 60;
  const nextRetryAt = shouldRetry ? new Date(Date.now() + backoffMin * 60_000) : null;

  await db.collection('reminder_queue').updateOne(
    { id: reminder.id },
    {
      $set: {
        status: success ? 'sent' : (shouldRetry ? 'pending' : 'failed'),
        scheduledFor: shouldRetry ? nextRetryAt : reminder.scheduledFor,
        nextRetryAt,
        updatedAt: new Date(),
        providerSid: result.sid || null,
        providerStatus: result.status || null,
        error: result.error || null,
      },
      $inc: { attempts: 1 },
    },
  );
  // Log in ai_calls history collection.
  await db.collection('ai_calls').insertOne({
    id: uuid(),
    userId: user.id,
    type: reminder.type,
    purpose: reminder.meta?.purpose || reminder.type,
    to,
    message,
    provider: result.provider,
    status: result.status,
    sid: result.sid || null,
    relatedTaskId: reminder.meta?.taskId || null,
    startedAt: result.startedAt || new Date(),
    createdAt: new Date(),
  });
  return { ok: result.ok, reason: result.error };
}

// Called by the cron worker at whatever cadence you configure.
export async function runDueReminders(db, { limit = 25 } = {}) {
  const now = new Date();
  const due = await db.collection('reminder_queue')
    .find({ status: 'pending', scheduledFor: { $lte: now } })
    .sort({ scheduledFor: 1 })
    .limit(limit)
    .toArray();
  // Fire reminders in parallel with a small concurrency cap so one slow
  // Twilio call cannot stall the whole batch.
  const CONCURRENCY = 5;
  const results = [];
  for (let i = 0; i < due.length; i += CONCURRENCY) {
    const chunk = due.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      chunk.map(r => processReminder(db, r).then(res => ({ id: r.id, ...res })))
    );
    for (let j = 0; j < settled.length; j += 1) {
      const s = settled[j];
      results.push(s.status === 'fulfilled' ? s.value : { id: chunk[j].id, ok: false, reason: s.reason?.message });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// V2.1 — Timezone-aware recurring reminder generator.
// Reads the user's `reminderSettings` (water frequency, meal times, workout
// time & days) and enqueues concrete reminders for the next 24 hours in the
// user's timezone. Uses purposeKey de-duplication so re-running is idempotent.
// ---------------------------------------------------------------------------
export async function scheduleRecurringForUser(db, user, { hoursAhead = 24 } = {}) {
  if (!user || !user.phone || !user.phoneVerified) return { enqueued: 0, reason: 'no_phone' };
  const settings = user.reminderSettings || {};
  if (settings.vacationMode) return { enqueued: 0, reason: 'vacation' };
  const tier = getTier(user);
  const tz = settings.timezone || user.preferences?.timezone || 'UTC';
  const now = new Date();
  const horizon = new Date(now.getTime() + hoursAhead * 3600_000);
  let enqueued = 0;
  const candidates = []; // { type, when, purposeKey, message }
  const collect = (type, when, purposeKey, message) => {
    if (when < now || when > horizon) return;
    candidates.push({ type, when, purposeKey, message });
  };

  // ---------- Water reminders ----------
  const water = settings.water || {};
  if (water.enabled && !water.paused && tierAllows(tier, 'waterReminderCalls')) {
    const freq = Math.max(15, Number(water.frequencyMinutes) || 60);
    const startH = Number(water.startHour ?? 9);
    const endH = Number(water.endHour ?? 21);
    const days = Array.isArray(water.days) && water.days.length ? water.days : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    // Iterate day-by-day within the horizon and generate freq-min slots only
    // inside [startH, endH). Cheap arithmetic — no per-minute DB round-trips.
    let dayCursor = dayjs.tz(now, tz).startOf('day');
    const endDay = dayjs.tz(horizon, tz).endOf('day');
    while (dayCursor.isBefore(endDay)) {
      const dayName = DAY_NAMES[dayCursor.day()];
      if (days.includes(dayName)) {
        for (let mi = 0; mi < (endH - startH) * 60; mi += freq) {
          const slot = dayCursor.hour(startH).minute(0).second(0).millisecond(0).add(mi, 'minute');
          const when = slot.toDate();
          const key = `water:${slot.format('YYYY-MM-DDTHH:mm')}`;
          collect('water', when, key, 'Hello! This is Suvio AI. Time to drink some water — staying hydrated keeps you sharp.');
        }
      }
      dayCursor = dayCursor.add(1, 'day');
    }
  }

  // ---------- Meal reminders ----------
  const meals = settings.meals || {};
  if (meals.enabled && !meals.paused && tierAllows(tier, 'mealReminderCalls')) {
    const mealTimes = [
      { name: 'breakfast', time: meals.breakfast || '08:00' },
      { name: 'lunch',     time: meals.lunch     || '13:00' },
      { name: 'dinner',    time: meals.dinner    || '20:00' },
    ];
    for (const m of mealTimes) {
      // Today & tomorrow in tz
      for (let dayOffset = 0; dayOffset < 2; dayOffset += 1) {
        const [h, mi] = String(m.time).split(':').map(Number);
        const local = dayjs.tz(now, tz).add(dayOffset, 'day').hour(h).minute(mi).second(0).millisecond(0);
        const when = local.toDate();
        const key = `meal_${m.name}:${local.format('YYYY-MM-DD')}`;
        collect('meal', when, key, `Hello! This is Suvio AI. It's almost time for your ${m.name}. Enjoy your meal.`);
      }
    }
  }

  // ---------- Workout reminders ----------
  const workout = settings.workout || {};
  if (workout.enabled && !workout.paused && tierAllows(tier, 'workoutReminderCalls')) {
    const days = Array.isArray(workout.days) && workout.days.length ? workout.days : ['Mon','Wed','Fri'];
    const [h, mi] = String(workout.time || '18:00').split(':').map(Number);
    const minsBefore = Math.max(0, Number(workout.minutesBefore) || 10);
    for (let dayOffset = 0; dayOffset < 2; dayOffset += 1) {
      const local = dayjs.tz(now, tz).add(dayOffset, 'day').hour(h).minute(mi).second(0).millisecond(0).subtract(minsBefore, 'minute');
      const dayName = DAY_NAMES[local.day()];
      if (!days.includes(dayName)) continue;
      const when = local.toDate();
      const key = `workout:${local.format('YYYY-MM-DDTHH:mm')}`;
      collect('workout', when, key, `Hello! This is Suvio AI. Your workout starts in ${minsBefore} minutes. Let's stay consistent today.`);
    }
  }

  // ---------- Bulk dedup + insert (single findMany + insertMany) ----------
  if (candidates.length === 0) return { enqueued: 0 };
  const keys = candidates.map(c => c.purposeKey);
  const existing = await db.collection('reminder_queue').find({
    userId: user.id,
    purposeKey: { $in: keys },
    status: { $in: ['pending', 'sent'] },
  }, { projection: { _id: 0, purposeKey: 1 } }).toArray();
  const existingSet = new Set(existing.map(e => e.purposeKey));
  const fresh = candidates.filter(c => !existingSet.has(c.purposeKey));
  if (fresh.length > 0) {
    const nowDate = new Date();
    const docs = fresh.map(c => ({
      id: uuid(), userId: user.id, type: c.type, scheduledFor: c.when, status: 'pending',
      meta: { message: c.message, purpose: `recurring_${c.type}` }, purposeKey: c.purposeKey,
      attempts: 0, createdAt: nowDate, updatedAt: nowDate,
    }));
    await db.collection('reminder_queue').insertMany(docs, { ordered: false });
    enqueued = docs.length;
  }
  return { enqueued };
}

// Bulk generator — walks every user with enabled settings and enqueues
// their next-window reminders. Cheap to run on the cron because
// `scheduleRecurringForUser` is idempotent via `purposeKey`.
export async function scheduleAllRecurring(db, { hoursAhead = 24 } = {}) {
  const users = await db.collection('users').find({
    'reminderSettings.vacationMode': { $ne: true },
    $or: [
      { 'reminderSettings.water.enabled': true },
      { 'reminderSettings.meals.enabled': true },
      { 'reminderSettings.workout.enabled': true },
    ],
    phone: { $exists: true, $ne: null },
    phoneVerified: true,
  }).toArray();
  // Run per-user schedulers in parallel with a small concurrency cap so a
  // large user base doesn't stall the cron tick.
  const CONCURRENCY = 8;
  const results = [];
  for (let i = 0; i < users.length; i += CONCURRENCY) {
    const batch = users.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map(u => scheduleRecurringForUser(db, u, { hoursAhead }).then(r => ({ userId: u.id, ...r })))
    );
    for (const s of settled) {
      if (s.status === 'fulfilled') results.push(s.value);
      else results.push({ userId: 'unknown', enqueued: 0, error: s.reason?.message });
    }
  }
  return results;
}
