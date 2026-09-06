#!/usr/bin/env node
/* Suvio in-container reminder cron.
 *
 * Fires POST /api/cron/reminders every minute against the local Next.js
 * server. Uses CRON_SECRET from the process env so the endpoint accepts it.
 *
 * Deliberately dependency-free (node's built-in `fetch` is all we need on
 * Node 18+) so this can run under supervisord without any install step.
 */

const TARGET = process.env.CRON_TARGET_URL || 'http://localhost:3000/api/cron/reminders';
const SECRET = process.env.CRON_SECRET;
const EVERY_MS = Math.max(15_000, Number(process.env.CRON_INTERVAL_MS) || 60_000);

if (!SECRET) {
  console.error('[cron-worker] CRON_SECRET is not set — refusing to start.');
  process.exit(1);
}

async function tick() {
  const started = Date.now();
  try {
    const res = await fetch(TARGET, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SECRET}`,
        'User-Agent': 'Suvio-Cron-Worker/1.0',
      },
    });
    const ms = Date.now() - started;
    if (!res.ok) {
      console.warn(`[cron-worker] ${res.status} in ${ms}ms`);
      return;
    }
    let body;
    try { body = await res.json(); } catch { body = null; }
    console.log(`[cron-worker] ok in ${ms}ms — processed=${body?.processed ?? '?'} scheduled=${body?.scheduled ?? '?'}`);
  } catch (e) {
    console.warn('[cron-worker] failed:', e?.message || e);
  }
}

// First tick after a short warmup so Next.js has time to compile on cold start.
setTimeout(() => { tick(); setInterval(tick, EVERY_MS); }, 15_000);
