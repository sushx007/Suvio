// Currency + plan pricing for Suvio.
// V1.1: Lifetime plan removed. Free / Pro / Standard / Premium (Monthly & Yearly).
import { CURRENCIES, FX_FROM_INR, convertFromINR, formatMoney } from './preferences';
export { CURRENCIES, FX_FROM_INR };

const LS_KEY = 'suvio.preferences';

function readCurrency() {
  if (typeof window === 'undefined') return 'INR';
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return 'INR';
    const p = JSON.parse(raw);
    return p.currency || 'INR';
  } catch { return 'INR'; }
}

// Live preference-aware formatter (backwards compatible).
export function fmt(amount, currency) {
  if (currency) return formatMoney(amount, currency);
  const c = readCurrency();
  const converted = convertFromINR(amount, c);
  return formatMoney(converted, c);
}

// Native (no conversion) — for prices declared per-currency (e.g. plan pricing).
export function fmtNative(amount, currency) {
  return formatMoney(amount, currency || readCurrency());
}

// Feature limits per plan tier — used by feature-gating middleware.
export const PLAN_LIMITS = {
  free:     { tasks: 20,   notes: 10,   documents: 3,   wardrobe: 10,  aiMessagesPerDay: 10,  storageMb: 25,  goals: 3,  analytics: false, phoneReminders: false, automations: 0 },
  pro:      { tasks: 200,  notes: 200,  documents: 50,  wardrobe: 100, aiMessagesPerDay: 100, storageMb: 500, goals: 20, analytics: true,  phoneReminders: false, automations: 5 },
  standard: { tasks: 1000, notes: 1000, documents: 250, wardrobe: 500, aiMessagesPerDay: 500, storageMb: 2000,goals: 50, analytics: true,  phoneReminders: true,  automations: 25 },
  premium:  { tasks: -1,   notes: -1,   documents: -1,  wardrobe: -1,  aiMessagesPerDay: -1,  storageMb: -1,  goals: -1, analytics: true,  phoneReminders: true,  automations: -1 },
};

// -1 means unlimited.

// Subscription plans. `id` includes billing period.
export const PLANS = {
  // Free is not sold — represented for completeness in UI.
  free: {
    id: 'free',
    tier: 'free',
    name: 'Suvio Free',
    period: 'forever',
    prices: { INR: 0, USD: 0, EUR: 0, GBP: 0, AUD: 0, CAD: 0, AED: 0, SGD: 0, JPY: 0 },
    features: ['Up to 20 tasks', 'Up to 10 notes', '3 documents', '10 AI messages/day', 'Core planner + finance'],
  },

  // PRO — good for individuals
  pro_monthly: {
    id: 'pro_monthly', tier: 'pro', name: 'Suvio Pro — Monthly', period: 'month',
    prices: { INR: 299, USD: 3.99, EUR: 3.49, GBP: 2.99, AUD: 5.99, CAD: 5.99, AED: 14, SGD: 4.99, JPY: 590 },
    features: ['More tasks, notes, documents', '100 AI messages/day', 'Basic analytics', 'Priority support'],
  },
  pro_yearly: {
    id: 'pro_yearly', tier: 'pro', name: 'Suvio Pro — Yearly', period: 'year', badge: 'Save 30%',
    prices: { INR: 2499, USD: 33, EUR: 29, GBP: 25, AUD: 49, CAD: 49, AED: 119, SGD: 42, JPY: 4900 },
    features: ['Everything in Pro Monthly', '30% cheaper than monthly', 'AI memory across time'],
  },

  // STANDARD — for power users
  standard_monthly: {
    id: 'standard_monthly', tier: 'standard', name: 'Suvio Standard — Monthly', period: 'month',
    prices: { INR: 599, USD: 6.99, EUR: 6.49, GBP: 5.99, AUD: 9.99, CAD: 9.99, AED: 26, SGD: 8.99, JPY: 990 },
    features: ['Advanced analytics dashboards', 'AI planning & summaries', '500 AI messages/day', 'AI phone reminders', 'More automations'],
  },
  standard_yearly: {
    id: 'standard_yearly', tier: 'standard', name: 'Suvio Standard — Yearly', period: 'year', badge: 'Save 35%',
    prices: { INR: 4999, USD: 55, EUR: 52, GBP: 49, AUD: 79, CAD: 79, AED: 199, SGD: 69, JPY: 8900 },
    features: ['Everything in Standard Monthly', '35% cheaper than monthly', 'Priority AI'],
  },

  // PREMIUM — complete Suvio experience
  premium_monthly: {
    id: 'premium_monthly', tier: 'premium', name: 'Suvio Premium — Monthly', period: 'month', badge: 'Most complete',
    prices: { INR: 999, USD: 11.99, EUR: 10.99, GBP: 9.99, AUD: 16.99, CAD: 16.99, AED: 45, SGD: 15, JPY: 1690 },
    features: ['Unlimited everything (practical)', 'All current + future premium features', 'Unlimited AI + phone calls', 'Concierge support'],
  },
  premium_yearly: {
    id: 'premium_yearly', tier: 'premium', name: 'Suvio Premium — Yearly', period: 'year', badge: 'Best value',
    prices: { INR: 8999, USD: 99, EUR: 89, GBP: 79, AUD: 149, CAD: 149, AED: 349, SGD: 129, JPY: 14900 },
    features: ['Everything in Premium Monthly', '25% cheaper than monthly', 'Founding member perks'],
  },
};

// Convenience: allowed plan IDs users can purchase.
export const PURCHASABLE_PLAN_IDS = [
  'pro_monthly', 'pro_yearly',
  'standard_monthly', 'standard_yearly',
  'premium_monthly', 'premium_yearly',
];

export function tierForPlan(planId) {
  return PLANS[planId]?.tier || 'free';
}

export function periodDaysForPlan(planId) {
  const p = PLANS[planId];
  if (!p) return 0;
  return p.period === 'year' ? 365 : p.period === 'month' ? 30 : 0;
}
