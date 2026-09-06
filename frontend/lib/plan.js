// Plan / feature-gate helpers. All limits live here — the API layer imports
// `enforceLimit` and `requireFeature` to gate endpoints.
import { PLAN_LIMITS } from './currency';

export const CALL_LIMITS = {
  free:     { taskReminderCallsPerMonth: 2,   waterReminderCalls: false, mealReminderCalls: false, workoutReminderCalls: false },
  pro:      { taskReminderCallsPerMonth: 25,  waterReminderCalls: true,  mealReminderCalls: false, workoutReminderCalls: false },
  standard: { taskReminderCallsPerMonth: 100, waterReminderCalls: true,  mealReminderCalls: false, workoutReminderCalls: false },
  premium:  { taskReminderCallsPerMonth: -1,  waterReminderCalls: true,  mealReminderCalls: true,  workoutReminderCalls: true  },
};

export const FEATURE_GATES = {
  // feature name -> array of allowed tiers
  bodyAnalysis:       ['standard', 'premium'],
  aiWorkoutPlan:      ['standard', 'premium'],
  aiDietPlan:         ['standard', 'premium'],
  waterReminderCalls: ['pro', 'standard', 'premium'],
  mealReminderCalls:  ['premium'],
  workoutReminderCalls: ['premium'],
  advancedAnalytics:  ['pro', 'standard', 'premium'],
};

export function getTier(user) {
  const t = user?.planTier || user?.plan || 'free';
  return ['free', 'pro', 'standard', 'premium'].includes(t) ? t : 'free';
}

export function planStatusIsActive(user) {
  if (!user) return false;
  const tier = getTier(user);
  if (tier === 'free') return true;
  if (!user.planExpiresAt) return true; // no expiry set == active
  return new Date(user.planExpiresAt) > new Date();
}

export function tierAllows(tier, feature) {
  const allowed = FEATURE_GATES[feature];
  if (!allowed) return true;
  return allowed.includes(tier);
}

// Return the plan feature limit for a given resource (-1 = unlimited).
export function limitFor(tier, resource) {
  return (PLAN_LIMITS[tier] ?? PLAN_LIMITS.free)[resource];
}

// Return the call limit for the given tier + reminder type.
export function callLimitFor(tier, key = 'taskReminderCallsPerMonth') {
  return (CALL_LIMITS[tier] ?? CALL_LIMITS.free)[key];
}

// YYYY-MM string used for monthly counters.
export function currentMonthKey(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// Consume 1 slot of the monthly-call counter. Returns { allowed, remaining, limit }.
export async function consumeCallSlot(db, user, key = 'taskReminderCallsPerMonth') {
  const tier = getTier(user);
  const limit = callLimitFor(tier, key);
  if (limit === false) return { allowed: false, remaining: 0, limit: 0, reason: 'not_in_plan' };
  if (limit === -1) return { allowed: true, remaining: -1, limit: -1 };
  const month = currentMonthKey();
  const field = `aiUsage.${month}.${key}`;
  const dbUser = await db.collection('users').findOne(
    { id: user.id },
    { projection: { [field]: 1 } },
  );
  const used = Number(dbUser?.aiUsage?.[month]?.[key] || 0);
  if (used >= limit) return { allowed: false, remaining: 0, limit, reason: 'limit_reached' };
  await db.collection('users').updateOne(
    { id: user.id },
    { $inc: { [field]: 1 } },
  );
  return { allowed: true, remaining: limit - used - 1, limit };
}
