import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/mongo';
import { signToken, hashPassword, comparePassword, getUserFromRequest } from '@/lib/auth';
import llm from '@/lib/llm';
import { TOOLS, executeTool } from '@/lib/tools';
import { KB, searchKB } from '@/lib/kb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (data, init = {}) => NextResponse.json(data, init);
const err = (message, status = 400) => NextResponse.json({ error: message }, { status });

async function requireUser(request) {
  const user = await getUserFromRequest(request);
  if (!user) return null;
  return user;
}

async function handle(request, ctx) {
  const { path = [] } = await ctx.params;
  const method = request.method;
  const p = path.join('/');
  const url = new URL(request.url);

  try {
    // Razorpay webhook (public — signature-verified)
    if (p === 'razorpay/webhook' && method === 'POST') {
      const crypto = await import('crypto');
      const rawBody = await request.text();
      const signature = request.headers.get('x-razorpay-signature');
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      if (expected !== signature) {
        console.warn('Razorpay webhook signature mismatch');
        return err('Bad signature', 401);
      }
      const event = JSON.parse(rawBody);
      const db = await getDb();
      await db.collection('webhook_events').insertOne({
        id: uuid(), source: 'razorpay', event: event.event, payload: event, receivedAt: new Date()
      });
      try {
        if (event.event === 'payment.captured') {
          const pay = event.payload.payment.entity;
          await db.collection('payments').updateOne(
            { orderId: pay.order_id },
            { $set: { status: 'captured', paymentId: pay.id, capturedAt: new Date() } }
          );
        } else if (event.event === 'payment.failed') {
          const pay = event.payload.payment.entity;
          await db.collection('payments').updateOne(
            { orderId: pay.order_id },
            { $set: { status: 'failed', failedAt: new Date(), failureReason: pay.error_description } }
          );
        } else if (event.event === 'refund.processed') {
          const refund = event.payload.refund.entity;
          await db.collection('payments').updateOne(
            { paymentId: refund.payment_id },
            { $set: { status: 'refunded', refundId: refund.id, refundedAt: new Date() } }
          );
        }
      } catch (e) {
        console.error('Webhook handler err:', e);
      }
      return json({ ok: true });
    }

    // ---------- AUTH (Phone-first — Google auth removed in V1.4) ----------

    // V1.4: send phone OTP BEFORE creating the account. Client passes basic
    // details for pre-validation, then calls /signup with the code to finish.
    if (p === 'auth/signup/send-otp' && method === 'POST') {
      const { email, phone } = await request.json();
      if (!phone) return err('Phone number is required');
      const db = await getDb();
      const existingPhone = await db.collection('users').findOne({ phone });
      if (existingPhone) return err('This phone number is already in use');
      if (email) {
        const existingEmail = await db.collection('users').findOne({ email });
        if (existingEmail) return err('Email already registered');
      }
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const tok = process.env.TWILIO_AUTH_TOKEN;
      const svc = process.env.TWILIO_VERIFY_SERVICE_SID;
      if (!sid || !tok || !svc) return json({ ok: true, devMode: true, message: 'Twilio Verify not configured — dev mode: use code 000000' });
      const auth = Buffer.from(`${sid}:${tok}`).toString('base64');
      const r = await fetch(`https://verify.twilio.com/v2/Services/${svc}/Verifications`, {
        method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: phone, Channel: 'sms' }),
      });
      const d = await r.json();
      if (!r.ok) return err(d?.message || 'Could not send OTP. Please check the phone number.', 500);
      return json({ ok: true, status: d.status });
    }

    if (p === 'auth/signup' && method === 'POST') {
      const { name, email, password, currency, phone, code } = await request.json();
      if (!name || !name.trim()) return err('Name is required');
      if (!phone) return err('Phone number is required');
      if (!password || password.length < 6) return err('Password must be at least 6 characters');
      if (!code) return err('OTP code is required');
      const db = await getDb();
      const orQuery = [{ phone }];
      if (email) orQuery.push({ email });
      const existing = await db.collection('users').findOne({ $or: orQuery });
      if (existing) return err(existing.phone === phone ? 'Phone number already in use' : 'Email already registered');
      // Verify phone OTP first (Twilio Verify, or dev-mode 000000).
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const tok = process.env.TWILIO_AUTH_TOKEN;
      const svc = process.env.TWILIO_VERIFY_SERVICE_SID;
      let approved = false;
      if (sid && tok && svc) {
        const auth = Buffer.from(`${sid}:${tok}`).toString('base64');
        const rr = await fetch(`https://verify.twilio.com/v2/Services/${svc}/VerificationCheck`, {
          method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ To: phone, Code: String(code) }),
        });
        const dd = await rr.json();
        approved = dd?.status === 'approved';
      } else {
        approved = String(code) === '000000';
      }
      if (!approved) return err('Invalid OTP code. Please try again.');
      const id = uuid();
      const hash = await hashPassword(password);
      const now = new Date();
      // Phone verified === account verified. No email verification step required.
      await db.collection('users').insertOne({
        id, name: name.trim(), email: email || null, password: hash,
        phone, phoneVerified: true, phoneVerifiedAt: now,
        plan: 'free', planTier: 'free', planExpiresAt: null,
        currency: currency || 'INR',
        emailVerified: !!email, // consider email verified since phone is the primary identity
        createdAt: now,
      });
      // Auto-login: issue session cookie so the client can go straight to /dashboard.
      const token = signToken({ id, email: email || null, name: name.trim(), phone });
      const res = json({ ok: true, user: { id, name: name.trim(), email: email || null, phone } });
      res.cookies.set('suvio_token', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
      return res;
    }

    // Legacy email-verify endpoints kept for backwards compatibility only.
    if (p === 'auth/verify-email' && method === 'GET') {
      const token = url.searchParams.get('token');
      if (!token) return err('Missing token', 400);
      const db = await getDb();
      const v = await db.collection('email_verifications').findOne({ token });
      if (!v) return err('Invalid or already-used verification link', 400);
      if (v.expiresAt && new Date(v.expiresAt) < new Date()) return err('This verification link has expired. Please request a new one.', 400);
      await db.collection('users').updateOne({ id: v.userId }, { $set: { emailVerified: true, emailVerifiedAt: new Date() } });
      await db.collection('email_verifications').deleteOne({ token });
      return json({ ok: true, message: 'Your email has been verified. You can now sign in.' });
    }

    if (p === 'auth/login' && method === 'POST') {
      // V1.4: primary identifier is phone. Accept `email` too for legacy accounts.
      const b = await request.json();
      const phone = (b.phone || '').trim();
      const email = (b.email || '').trim().toLowerCase();
      const password = b.password || '';
      if ((!phone && !email) || !password) return err('Enter your phone number and password', 400);
      const db = await getDb();
      const query = phone ? { phone } : { email };
      const u = await db.collection('users').findOne(query);
      if (!u) return err('Invalid credentials', 401);
      if (!u.password) return err('This account has no password set. Please reset it.', 401);
      const ok = await comparePassword(password, u.password);
      if (!ok) return err('Invalid credentials', 401);
      // Phone-verified accounts are considered verified. Legacy email accounts
      // that were created before V1.4 without a verified phone still need the
      // email-verify gate.
      if (!u.phoneVerified && !u.emailVerified) return err('Please verify your phone before signing in.', 403);
      const token = signToken({ id: u.id, email: u.email || null, name: u.name, phone: u.phone });
      const res = json({ user: { id: u.id, name: u.name, email: u.email || null, phone: u.phone } });
      res.cookies.set('suvio_token', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
      return res;
    }

    // V1.4: Forgot-password — phone OTP flow (email flow removed).
    if (p === 'auth/forgot/send-otp' && method === 'POST') {
      const { phone } = await request.json();
      if (!phone) return err('Phone number is required');
      const db = await getDb();
      const u = await db.collection('users').findOne({ phone });
      // Deliberately return ok even if user missing, to avoid phone enumeration.
      if (!u) return json({ ok: true, devMode: false });
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const tok = process.env.TWILIO_AUTH_TOKEN;
      const svc = process.env.TWILIO_VERIFY_SERVICE_SID;
      if (!sid || !tok || !svc) return json({ ok: true, devMode: true, message: 'Twilio Verify not configured — dev mode: use code 000000' });
      const auth = Buffer.from(`${sid}:${tok}`).toString('base64');
      const r = await fetch(`https://verify.twilio.com/v2/Services/${svc}/Verifications`, {
        method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: phone, Channel: 'sms' }),
      });
      const d = await r.json();
      if (!r.ok) return err(d?.message || 'Could not send OTP.', 500);
      return json({ ok: true, status: d.status });
    }

    if (p === 'auth/forgot/reset' && method === 'POST') {
      const { phone, code, newPassword } = await request.json();
      if (!phone || !code || !newPassword) return err('Missing fields', 400);
      if (newPassword.length < 6) return err('Password must be at least 6 characters', 400);
      const db = await getDb();
      const u = await db.collection('users').findOne({ phone });
      if (!u) return err('Account not found', 404);
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const tok = process.env.TWILIO_AUTH_TOKEN;
      const svc = process.env.TWILIO_VERIFY_SERVICE_SID;
      let approved = false;
      if (sid && tok && svc) {
        const auth = Buffer.from(`${sid}:${tok}`).toString('base64');
        const rr = await fetch(`https://verify.twilio.com/v2/Services/${svc}/VerificationCheck`, {
          method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ To: phone, Code: String(code) }),
        });
        const dd = await rr.json();
        approved = dd?.status === 'approved';
      } else {
        approved = String(code) === '000000';
      }
      if (!approved) return err('Invalid OTP code', 400);
      const hash = await hashPassword(newPassword);
      await db.collection('users').updateOne({ id: u.id }, { $set: { password: hash, passwordResetAt: new Date() } });
      // Auto-login after successful reset.
      const token = signToken({ id: u.id, email: u.email || null, name: u.name, phone: u.phone });
      const res = json({ ok: true, user: { id: u.id, name: u.name, email: u.email || null, phone: u.phone } });
      res.cookies.set('suvio_token', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
      return res;
    }
    if (p === 'auth/logout' && method === 'POST') {
      const res = json({ ok: true });
      res.cookies.delete('suvio_token');
      return res;
    }
    if (p === 'me' && method === 'GET') {
      const user = await requireUser(request);
      if (!user) return err('Unauthorized', 401);
      const db = await getDb();
      let dbUser = await db.collection('users').findOne({ id: user.id }, { projection: { _id: 0, password: 0 } });
      // V1.1: migrate legacy trial/lifetime users -> free/premium respectively.
      if (dbUser && (dbUser.plan === 'trial' || dbUser.plan === 'lifetime' || dbUser.trialEndsAt)) {
        const migrate = { $unset: { trialEndsAt: '', trialStart: '' } };
        if (dbUser.plan === 'lifetime') {
          migrate.$set = { plan: 'premium', planTier: 'premium', planExpiresAt: null };
        } else {
          migrate.$set = { plan: 'free', planTier: 'free', planExpiresAt: null };
        }
        await db.collection('users').updateOne({ id: user.id }, migrate);
        dbUser = await db.collection('users').findOne({ id: user.id }, { projection: { _id: 0, password: 0 } });
      }
      // Compute effective plan status
      const now = new Date();
      const tier = dbUser?.planTier || dbUser?.plan || 'free';
      let planStatus = 'free';
      if (['pro', 'standard', 'premium'].includes(tier)) {
        if (!dbUser.planExpiresAt || new Date(dbUser.planExpiresAt) > now) planStatus = 'pro';
        else planStatus = 'expired';
      }
      return json({ user: { ...dbUser, planStatus, planTier: tier, daysLeft: 0 } });
    }

    // ---------- V2.1: CRON WORKER (public, secret-authenticated) ----------
    // Must be defined BEFORE the requireUser gate so external schedulers
    // (Vercel Cron / Upstash / GitHub Actions) can hit it without a cookie.
    if (p === 'cron/reminders' && method === 'POST') {
      const auth = request.headers.get('authorization') || '';
      const secret = process.env.CRON_SECRET;
      if (!secret || auth !== `Bearer ${secret}`) return err('Unauthorized', 401);
      const db = await getDb();
      const { runDueReminders, scheduleAllRecurring } = await import('@/lib/scheduler');
      let scheduled = [];
      try { scheduled = await scheduleAllRecurring(db, { hoursAhead: 24 }); } catch (e) { console.warn('scheduleAllRecurring failed:', e.message); }
      const results = await runDueReminders(db, { limit: 25 });
      return json({ ok: true, processed: results.length, scheduled: scheduled.length, results });
    }

    const user = await requireUser(request);
    if (!user) return err('Unauthorized', 401);
    const db = await getDb();

    // ---------- V1.2: PLAN ENFORCEMENT / FEATURE GATES (hoisted so all
    // endpoint handlers below can call these helpers) ----------
    const { getTier, tierAllows, callLimitFor, currentMonthKey, consumeCallSlot, limitFor } = await import('@/lib/plan');
    const { enqueueReminder } = await import('@/lib/scheduler');
    const { voiceProviderConfigured } = await import('@/lib/voice');
    async function enforceLimit(resource, collection) {
      const u = await db.collection('users').findOne({ id: user.id }, { projection: { planTier: 1, plan: 1 } });
      const tier = getTier(u);
      const limit = limitFor(tier, resource);
      if (limit === -1 || limit == null) return null;
      const count = await db.collection(collection).countDocuments({ userId: user.id });
      if (count >= limit) return err(`Your ${tier} plan allows only ${limit} ${resource}. Upgrade to add more.`, 402);
      return null;
    }
    async function enforceDailyAiLimit() {
      const u = await db.collection('users').findOne({ id: user.id }, { projection: { planTier: 1, plan: 1, aiUsage: 1 } });
      const tier = getTier(u);
      const limit = limitFor(tier, 'aiMessagesPerDay');
      if (limit === -1) return null;
      const day = new Date().toISOString().slice(0, 10);
      const used = Number(u?.aiUsage?.[day]?.aiMessagesPerDay || 0);
      if (used >= limit) return err(`Your ${tier} plan allows ${limit} AI messages per day. Upgrade for more.`, 402);
      await db.collection('users').updateOne({ id: user.id }, { $inc: { [`aiUsage.${day}.aiMessagesPerDay`]: 1 } });
      return null;
    }

    // ---------- GOALS (Phase 2) ----------
    if (p === 'goals' && method === 'GET') {
      const items = await db.collection('goals').find({ userId: user.id }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
      return json({ items });
    }
    if (p === 'goals' && method === 'POST') {
      const g = await enforceLimit('goals', 'goals'); if (g) return g;
      const b = await request.json();
      const item = {
        id: uuid(), userId: user.id,
        title: b.title, category: b.category || 'personal',
        type: b.type || 'numeric', // numeric | boolean | habit
        target: Number(b.target) || 100,
        current: Number(b.current) || 0,
        unit: b.unit || '',
        deadline: b.deadline || null,
        streak: 0, completedAt: null,
        color: b.color || '#38bdf8',
        icon: b.icon || 'Target',
        createdAt: new Date(),
      };
      await db.collection('goals').insertOne(item);
      return json({ item });
    }
    if (p.startsWith('goals/') && method === 'PATCH') {
      const id = p.split('/')[1];
      const b = await request.json();
      const upd = { ...b };
      if ('current' in upd) upd.current = Number(upd.current) || 0;
      if ('target' in upd) upd.target = Number(upd.target) || 0;
      const existing = await db.collection('goals').findOne({ id, userId: user.id });
      if (existing && upd.current >= (upd.target ?? existing.target) && !existing.completedAt) {
        upd.completedAt = new Date();
      }
      await db.collection('goals').updateOne({ id, userId: user.id }, { $set: { ...upd, updatedAt: new Date() } });
      const item = await db.collection('goals').findOne({ id, userId: user.id }, { projection: { _id: 0 } });
      return json({ item });
    }
    if (p.startsWith('goals/') && method === 'DELETE') {
      const id = p.split('/')[1];
      await db.collection('goals').deleteOne({ id, userId: user.id });
      return json({ ok: true });
    }

    // ---------- AI MEMORY (Phase 2) ----------
    if (p === 'ai/memory' && method === 'GET') {
      const [items, u] = await Promise.all([
        db.collection('ai_memory').find({ userId: user.id }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray(),
        db.collection('users').findOne({ id: user.id }, { projection: { preferences: 1 } }),
      ]);
      const enabled = u?.preferences?.aiMemoryEnabled !== false; // default on
      return json({ items, enabled });
    }
    if (p === 'ai/memory' && method === 'POST') {
      const b = await request.json();
      const item = { id: uuid(), userId: user.id, category: b.category || 'general', content: b.content, source: b.source || 'manual', createdAt: new Date() };
      await db.collection('ai_memory').insertOne(item);
      const { _id, ...rest } = item;
      return json({ item: rest });
    }
    if (p === 'ai/memory' && method === 'PATCH') {
      // Toggle memory feature
      const b = await request.json();
      await db.collection('users').updateOne({ id: user.id }, { $set: { 'preferences.aiMemoryEnabled': !!b.enabled } });
      return json({ ok: true, enabled: !!b.enabled });
    }
    if (p === 'ai/memory' && method === 'DELETE') {
      // Clear all
      await db.collection('ai_memory').deleteMany({ userId: user.id });
      return json({ ok: true });
    }
    if (p.startsWith('ai/memory/') && method === 'PATCH') {
      const id = p.split('/')[2];
      const b = await request.json();
      await db.collection('ai_memory').updateOne({ id, userId: user.id }, { $set: { content: b.content, category: b.category, updatedAt: new Date() } });
      const item = await db.collection('ai_memory').findOne({ id, userId: user.id }, { projection: { _id: 0 } });
      return json({ item });
    }
    if (p.startsWith('ai/memory/') && method === 'DELETE') {
      const id = p.split('/')[2];
      await db.collection('ai_memory').deleteOne({ id, userId: user.id });
      return json({ ok: true });
    }

    // ---------- ACHIEVEMENTS (Phase 2) ----------
    if (p === 'achievements' && method === 'GET') {
      // Compute achievements dynamically from user's data
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
      const [tasksDone, txCount, notesCount, tripsCount, wardrobeCount, weightLogs, waterLogs, goals] = await Promise.all([
        db.collection('tasks').countDocuments({ userId: user.id, completed: true }),
        db.collection('transactions').countDocuments({ userId: user.id }),
        db.collection('notes').countDocuments({ userId: user.id }),
        db.collection('trips').countDocuments({ userId: user.id }),
        db.collection('wardrobe_items').countDocuments({ userId: user.id }),
        db.collection('weight_logs').countDocuments({ userId: user.id }),
        db.collection('water_logs').countDocuments({ userId: user.id }),
        db.collection('goals').find({ userId: user.id }).toArray(),
      ]);
      const goalsCompleted = goals.filter(g => g.completedAt).length;
      const defs = [
        { id:'first_task', name:'First Steps', desc:'Complete your first task', icon:'🎯', target:1, current:tasksDone, cat:'productivity' },
        { id:'task_10', name:'Getting Things Done', desc:'Complete 10 tasks', icon:'✅', target:10, current:tasksDone, cat:'productivity' },
        { id:'task_50', name:'Task Master', desc:'Complete 50 tasks', icon:'🏆', target:50, current:tasksDone, cat:'productivity' },
        { id:'task_100', name:'Century Club', desc:'Complete 100 tasks', icon:'💯', target:100, current:tasksDone, cat:'productivity' },
        { id:'first_expense', name:'Money Aware', desc:'Log your first transaction', icon:'💰', target:1, current:txCount, cat:'finance' },
        { id:'expense_50', name:'Budget Tracker', desc:'Log 50 transactions', icon:'📊', target:50, current:txCount, cat:'finance' },
        { id:'first_note', name:'Ink Well', desc:'Write your first note', icon:'📝', target:1, current:notesCount, cat:'notes' },
        { id:'note_25', name:'Prolific Writer', desc:'Write 25 notes', icon:'📚', target:25, current:notesCount, cat:'notes' },
        { id:'first_trip', name:'Wanderlust', desc:'Plan your first trip', icon:'✈️', target:1, current:tripsCount, cat:'travel' },
        { id:'trip_5', name:'Globe Trotter', desc:'Plan 5 trips', icon:'🌍', target:5, current:tripsCount, cat:'travel' },
        { id:'first_outfit', name:'Style Starter', desc:'Add your first wardrobe item', icon:'👗', target:1, current:wardrobeCount, cat:'wardrobe' },
        { id:'wardrobe_25', name:'Fashionista', desc:'Track 25 wardrobe items', icon:'👑', target:25, current:wardrobeCount, cat:'wardrobe' },
        { id:'water_50', name:'Hydration Hero', desc:'Log water 50 times', icon:'💧', target:50, current:waterLogs, cat:'health' },
        { id:'weight_log', name:'Body Aware', desc:'Log your weight', icon:'⚖️', target:1, current:weightLogs, cat:'health' },
        { id:'first_goal', name:'Goal Setter', desc:'Complete your first goal', icon:'🌟', target:1, current:goalsCompleted, cat:'goals' },
        { id:'goal_5', name:'Achiever', desc:'Complete 5 goals', icon:'🚀', target:5, current:goalsCompleted, cat:'goals' },
      ];
      const items = defs.map(d => ({
        ...d,
        unlocked: d.current >= d.target,
        progress: Math.min(1, d.current / d.target),
      }));
      const unlocked = items.filter(i => i.unlocked).length;
      return json({ items, unlocked, total: items.length });
    }

    // ---------- ENHANCED INSIGHTS (Phase 2) ----------
    if (p === 'insights/full' && method === 'GET') {
      const now = new Date();
      const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
      const prevMonthStart = new Date(monthStart); prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
      const [tx, tasks, water, weights, goals] = await Promise.all([
        db.collection('transactions').find({ userId: user.id, date: { $gte: prevMonthStart } }).toArray(),
        db.collection('tasks').find({ userId: user.id }).toArray(),
        db.collection('water_logs').find({ userId: user.id, date: { $gte: new Date(now.getTime() - 7*24*60*60*1000) } }).toArray(),
        db.collection('weight_logs').find({ userId: user.id }).sort({ date: -1 }).limit(10).toArray(),
        db.collection('goals').find({ userId: user.id }).toArray(),
      ]);
      // Monthly spending trend (by category)
      const monthTx = tx.filter(t => t.date >= monthStart);
      const prevMonthTx = tx.filter(t => t.date < monthStart && t.date >= prevMonthStart);
      const monthSpent = monthTx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
      const prevSpent = prevMonthTx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
      const spendChange = prevSpent ? ((monthSpent-prevSpent)/prevSpent*100) : 0;
      const byCat = {};
      monthTx.filter(t=>t.type==='expense').forEach(t=>{ byCat[t.category]=(byCat[t.category]||0)+t.amount; });
      // Daily spending last 30 days
      const daily = {};
      for (let i=0;i<30;i++){ const d = new Date(now); d.setDate(d.getDate()-i); daily[d.toISOString().slice(0,10)] = 0; }
      monthTx.filter(t=>t.type==='expense').forEach(t=>{ const k = new Date(t.date).toISOString().slice(0,10); if (k in daily) daily[k]+=t.amount; });
      const dailySeries = Object.entries(daily).sort().map(([d,v])=>({ date: d, value: v }));
      // Task metrics
      const doneTasks = tasks.filter(t=>t.completed).length;
      const openTasks = tasks.filter(t=>!t.completed).length;
      const completionRate = tasks.length ? (doneTasks/tasks.length*100) : 0;
      // Water avg
      const waterAvg = water.length ? water.reduce((s,w)=>s+w.ml,0)/7 : 0;
      // Weight trend
      const weightTrend = weights.length >= 2 ? (weights[0].kg - weights[weights.length-1].kg) : 0;
      // Goals
      const openGoals = goals.filter(g=>!g.completedAt).length;
      const completedGoals = goals.filter(g=>g.completedAt).length;
      return json({
        finance: { monthSpent, prevSpent, spendChange, byCat, dailySeries },
        productivity: { doneTasks, openTasks, completionRate },
        health: { waterAvg, weightTrend, weightHistory: weights.reverse() },
        goals: { openGoals, completedGoals },
      });
    }

    // ---------- PROFILE / SETTINGS ----------
    if (p === 'profile' && method === 'PATCH') {
      const b = await request.json();
      const allowed = ['name', 'currency', 'theme'];
      const upd = {};
      for (const k of allowed) if (k in b) upd[k] = b[k];
      await db.collection('users').updateOne({ id: user.id }, { $set: upd });
      const u = await db.collection('users').findOne({ id: user.id }, { projection: { _id: 0, password: 0 } });
      return json({ user: u });
    }

    // ---------- GLOBAL PREFERENCES (Phase 1) ----------
    // One canonical store for theme, accentColor, currency, language, timezone,
    // dateFormat, numberFormat. Loads on every page for instant sync.
    if (p === 'preferences' && method === 'GET') {
      const u = await db.collection('users').findOne({ id: user.id }, { projection: { _id: 0, preferences: 1, currency: 1, theme: 1 } });
      const prefs = u?.preferences || {};
      // Backfill from legacy fields
      const merged = {
        theme: prefs.theme || u?.theme || 'midnight',
        accentColor: prefs.accentColor || '#38bdf8',
        currency: prefs.currency || u?.currency || 'INR',
        language: prefs.language || 'en',
        timezone: prefs.timezone || 'Asia/Kolkata',
        dateFormat: prefs.dateFormat || 'DD MMM YYYY',
        numberFormat: prefs.numberFormat || 'en-IN',
      };
      return json({ preferences: merged });
    }
    if (p === 'preferences' && method === 'PATCH') {
      const b = await request.json();
      const allowed = ['theme', 'accentColor', 'currency', 'language', 'timezone', 'dateFormat', 'numberFormat'];
      const upd = {};
      for (const k of allowed) if (k in b) upd[`preferences.${k}`] = b[k];
      // Also mirror currency to top-level for legacy code paths
      if (b.currency) upd.currency = b.currency;
      await db.collection('users').updateOne({ id: user.id }, { $set: upd });
      return json({ ok: true });
    }

    // ---------- SUBSCRIPTION (MOCKED PAYMENT) ----------
    // ---------- RAZORPAY PAYMENTS (Phase 2 - global) ----------
    // Create an order for the selected plan + currency
    if (p === 'razorpay/order' && method === 'POST') {
      const Razorpay = (await import('razorpay')).default;
      const { PLANS, PURCHASABLE_PLAN_IDS } = await import('@/lib/currency');
      const { planId, currency: reqCurrency } = await request.json();
      if (!PURCHASABLE_PLAN_IDS.includes(planId)) return err('Invalid plan');
      const dbUser = await db.collection('users').findOne({ id: user.id }, { projection: { _id: 0, preferences: 1, currency: 1 } });
      const currency = (reqCurrency || dbUser?.preferences?.currency || dbUser?.currency || 'INR').toUpperCase();
      const plan = PLANS[planId];
      const nativePrice = plan.prices[currency] ?? plan.prices.INR;
      // Razorpay expects amount in smallest currency unit (paise for INR, cents for USD, etc.).
      // JPY has no decimal.
      const zeroDecimal = ['JPY'];
      const amount = Math.round(zeroDecimal.includes(currency) ? nativePrice : nativePrice * 100);
      try {
        const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
        const order = await rzp.orders.create({
          amount,
          currency,
          receipt: `suvio_${planId}_${user.id.slice(0,8)}_${Date.now()}`.slice(0, 40),
          notes: { userId: user.id, planId, email: user.email, planName: plan.name },
        });
        // Persist a pending payment record
        await db.collection('payments').insertOne({
          id: uuid(),
          userId: user.id,
          orderId: order.id,
          planId,
          amount: nativePrice,
          currency,
          status: 'created',
          createdAt: new Date(),
        });
        return json({
          orderId: order.id,
          amount,
          currency,
          keyId: process.env.RAZORPAY_KEY_ID,
          planId,
          planName: plan.name,
          nativePrice,
        });
      } catch (e) {
        console.error('Razorpay order error:', e);
        return err(e.error?.description || e.message || 'Order creation failed', 500);
      }
    }

    // Verify signature and activate plan
    if (p === 'razorpay/verify' && method === 'POST') {
      const crypto = await import('crypto');
      const b = await request.json();
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = b;
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return err('Missing verification fields');
      const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
      if (expected !== razorpay_signature) return err('Signature mismatch', 400);
      const payment = await db.collection('payments').findOne({ orderId: razorpay_order_id, userId: user.id });
      if (!payment) return err('Payment record not found', 404);
      const { PLANS: PLANS2, tierForPlan, periodDaysForPlan } = await import('@/lib/currency');
      const now = new Date();
      const tier = tierForPlan(payment.planId);
      const days = periodDaysForPlan(payment.planId);
      const planExpiresAt = days ? new Date(now.getTime() + days * 24 * 60 * 60 * 1000) : null;
      await db.collection('users').updateOne(
        { id: user.id },
        { $set: { plan: tier, planTier: tier, planSku: payment.planId, planExpiresAt, subscribedAt: now, cancelledAt: null, lastPaymentId: razorpay_payment_id } }
      );
      await db.collection('payments').updateOne(
        { orderId: razorpay_order_id },
        { $set: { status: 'paid', paymentId: razorpay_payment_id, paidAt: now, signature: razorpay_signature } }
      );
      return json({ ok: true, plan: tier, planExpiresAt });
    }

    // Refund estimator (dry-run) — returns estimated refund based on usage
    if (p === 'subscribe/refund-estimate' && method === 'GET') {
      const dbUser = await db.collection('users').findOne({ id: user.id });
      if (!dbUser) return err('User not found', 404);
      if (!['pro', 'standard', 'premium'].includes(dbUser.plan)) return err('No active subscription');
      const payment = await db.collection('payments').findOne({ userId: user.id, status: 'paid' }, { sort: { paidAt: -1 } });
      if (!payment) return err('No payment record');
      const now = new Date();
      const paidAt = payment.paidAt || dbUser.subscribedAt || now;
      const totalDays = /_yearly$/.test(dbUser.planSku || '') ? 365 : 30;
      const usedDays = Math.max(0, Math.min(totalDays, Math.floor((now - new Date(paidAt)) / (24*60*60*1000))));
      const remainingDays = Math.max(0, totalDays - usedDays);
      const dailyRate = payment.amount / totalDays;
      // Usage penalty: platform usage reduces refund up to 20%
      const [taskCount, txCount, aiMsgs] = await Promise.all([
        db.collection('tasks').countDocuments({ userId: user.id }),
        db.collection('transactions').countDocuments({ userId: user.id }),
        db.collection('ai_messages').countDocuments({ userId: user.id }),
      ]);
      const totalActions = taskCount + txCount + aiMsgs;
      // Cap the usage penalty at 20%
      const usagePenaltyPct = Math.min(0.20, totalActions / 500 * 0.20);
      const baseRefund = dailyRate * remainingDays;
      const usagePenalty = baseRefund * usagePenaltyPct;
      const finalRefund = Math.max(0, baseRefund - usagePenalty);
      return json({
        payment: { amount: payment.amount, currency: payment.currency, planId: payment.planId, paidAt },
        totalDays, usedDays, remainingDays,
        dailyRate: Number(dailyRate.toFixed(2)),
        baseRefund: Number(baseRefund.toFixed(2)),
        usagePenaltyPct: Number((usagePenaltyPct*100).toFixed(1)),
        usagePenalty: Number(usagePenalty.toFixed(2)),
        finalRefund: Number(finalRefund.toFixed(2)),
        usageActions: totalActions,
      });
    }

    // Cancel and process refund
    if (p === 'subscribe/cancel-with-refund' && method === 'POST') {
      const Razorpay = (await import('razorpay')).default;
      const dbUser = await db.collection('users').findOne({ id: user.id });
      if (!dbUser) return err('User not found', 404);
      if (!['pro', 'standard', 'premium'].includes(dbUser.plan)) return err('No active subscription');
      const payment = await db.collection('payments').findOne({ userId: user.id, status: 'paid' }, { sort: { paidAt: -1 } });
      if (!payment || !payment.paymentId) return err('No refundable payment');
      // Compute refund server-side using same logic
      const now = new Date();
      const paidAt = payment.paidAt;
      const totalDays = /_yearly$/.test(dbUser.planSku || '') ? 365 : 30;
      const usedDays = Math.max(0, Math.min(totalDays, Math.floor((now - new Date(paidAt)) / (24*60*60*1000))));
      const remainingDays = Math.max(0, totalDays - usedDays);
      const dailyRate = payment.amount / totalDays;
      const [taskCount, txCount, aiMsgs] = await Promise.all([
        db.collection('tasks').countDocuments({ userId: user.id }),
        db.collection('transactions').countDocuments({ userId: user.id }),
        db.collection('ai_messages').countDocuments({ userId: user.id }),
      ]);
      const totalActions = taskCount + txCount + aiMsgs;
      const usagePenaltyPct = Math.min(0.20, totalActions / 500 * 0.20);
      const finalRefund = Math.max(0, (dailyRate * remainingDays) * (1 - usagePenaltyPct));
      const zeroDecimal = ['JPY'];
      const refundAmount = Math.round(zeroDecimal.includes(payment.currency) ? finalRefund : finalRefund * 100);
      try {
        const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
        let refundResult = null;
        if (refundAmount > 0) {
          refundResult = await rzp.payments.refund(payment.paymentId, {
            amount: refundAmount,
            notes: { reason: 'user_cancellation', userId: user.id, remainingDays: String(remainingDays) },
          });
        }
        await db.collection('users').updateOne(
          { id: user.id },
          { $set: { plan: 'expired', planExpiresAt: null, cancelledAt: now, refundedAt: now, refundId: refundResult?.id || null } }
        );
        await db.collection('payments').updateOne(
          { paymentId: payment.paymentId },
          { $set: { status: 'refunded', refundId: refundResult?.id || null, refundAmount: finalRefund, refundedAt: now } }
        );
        return json({ ok: true, refundAmount: finalRefund, refundId: refundResult?.id || null, currency: payment.currency });
      } catch (e) {
        console.error('Refund error:', e);
        return err(e.error?.description || e.message || 'Refund failed', 500);
      }
    }

    // Billing history (Razorpay payment records)
    if (p === 'billing/history' && method === 'GET') {
      const items = await db.collection('payments').find({ userId: user.id }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(50).toArray();
      return json({ items });
    }

    // ---------- SUBSCRIPTION (LEGACY MOCK - kept for backwards compat) ----------
    if (p === 'subscribe' && method === 'POST') {
      const { PURCHASABLE_PLAN_IDS, tierForPlan, periodDaysForPlan } = await import('@/lib/currency');
      const { planId } = await request.json();
      if (!PURCHASABLE_PLAN_IDS.includes(planId)) return err('Invalid plan');
      const now = new Date();
      const tier = tierForPlan(planId);
      const days = periodDaysForPlan(planId);
      const planExpiresAt = days ? new Date(now.getTime() + days * 24 * 60 * 60 * 1000) : null;
      await db.collection('users').updateOne(
        { id: user.id },
        { $set: { plan: tier, planTier: tier, planSku: planId, planExpiresAt, subscribedAt: now, cancelledAt: null } }
      );
      return json({ ok: true, plan: tier, planExpiresAt });
    }

    if (p === 'subscribe/cancel' && method === 'POST') {
      const now = new Date();
      const dbUser = await db.collection('users').findOne({ id: user.id });
      if (!dbUser || !['pro', 'standard', 'premium'].includes(dbUser.plan)) return err('No active plan');
      // Cancel-at-period-end: keep pro access until planExpiresAt, then downgrade to expired
      await db.collection('users').updateOne(
        { id: user.id },
        { $set: { cancelledAt: now } }
      );
      return json({ ok: true, cancelledAt: now, accessUntil: dbUser.planExpiresAt });
    }

    // Generic settings collections (finance, health, wardrobe, travel)
    for (const mod of ['finance', 'health', 'wardrobe', 'travel']) {
      if (p === `${mod}/settings` && method === 'GET') {
        const s = await db.collection('settings').findOne({ userId: user.id, module: mod }, { projection: { _id: 0 } });
        return json({ settings: s?.data || {} });
      }
      if (p === `${mod}/settings` && method === 'PUT') {
        const b = await request.json();
        await db.collection('settings').updateOne({ userId: user.id, module: mod }, { $set: { userId: user.id, module: mod, data: b, updatedAt: new Date() } }, { upsert: true });
        return json({ settings: b });
      }
    }

    // ---------- TASKS ----------
    if (p === 'tasks' && method === 'GET') {
      const items = await db.collection('tasks').find({ userId: user.id }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(200).toArray();
      return json({ items });
    }
    if (p === 'tasks' && method === 'POST') {
      const g = await enforceLimit('tasks', 'tasks'); if (g) return g;
      const b = await request.json();
      const item = { id: uuid(), userId: user.id, title: b.title, priority: b.priority || 'medium', dueDate: b.dueDate || null, category: b.category || 'general', completed: false, createdAt: new Date() };
      await db.collection('tasks').insertOne(item);
      return json({ item });
    }
    if (p.startsWith('tasks/') && method === 'PATCH') {
      const id = p.split('/')[1];
      const b = await request.json();
      await db.collection('tasks').updateOne({ id, userId: user.id }, { $set: { ...b, updatedAt: new Date() } });
      const item = await db.collection('tasks').findOne({ id, userId: user.id }, { projection: { _id: 0 } });
      return json({ item });
    }
    if (p.startsWith('tasks/') && method === 'DELETE') {
      const id = p.split('/')[1];
      await db.collection('tasks').deleteOne({ id, userId: user.id });
      return json({ ok: true });
    }

    // ---------- TRANSACTIONS ----------
    if (p === 'transactions' && method === 'GET') {
      const items = await db.collection('transactions').find({ userId: user.id }, { projection: { _id: 0 } }).sort({ date: -1 }).limit(500).toArray();
      return json({ items });
    }
    if (p === 'transactions' && method === 'POST') {
      const b = await request.json();
      const item = { id: uuid(), userId: user.id, type: b.type || 'expense', amount: Number(b.amount) || 0, category: b.category || 'other', note: b.note || '', date: b.date ? new Date(b.date) : new Date(), createdAt: new Date() };
      await db.collection('transactions').insertOne(item);
      return json({ item });
    }
    if (p.startsWith('transactions/') && method === 'PATCH') {
      const id = p.split('/')[1];
      const b = await request.json();
      if (b.amount) b.amount = Number(b.amount);
      await db.collection('transactions').updateOne({ id, userId: user.id }, { $set: { ...b, updatedAt: new Date() } });
      const item = await db.collection('transactions').findOne({ id, userId: user.id }, { projection: { _id: 0 } });
      return json({ item });
    }
    if (p.startsWith('transactions/') && method === 'DELETE') {
      const id = p.split('/')[1];
      await db.collection('transactions').deleteOne({ id, userId: user.id });
      return json({ ok: true });
    }

    // ---------- NOTES ----------
    if (p === 'notes' && method === 'GET') {
      const items = await db.collection('notes').find({ userId: user.id }, { projection: { _id: 0 } }).sort({ updatedAt: -1, createdAt: -1 }).limit(500).toArray();
      return json({ items });
    }
    if (p === 'notes' && method === 'POST') {
      const g = await enforceLimit('notes', 'notes'); if (g) return g;
      const b = await request.json();
      const item = { id: uuid(), userId: user.id, title: b.title || 'Untitled', content: b.content || '', pinned: false, createdAt: new Date(), updatedAt: new Date() };
      await db.collection('notes').insertOne(item);
      return json({ item });
    }
    if (p.startsWith('notes/') && method === 'PATCH') {
      const id = p.split('/')[1];
      const b = await request.json();
      await db.collection('notes').updateOne({ id, userId: user.id }, { $set: { ...b, updatedAt: new Date() } });
      const item = await db.collection('notes').findOne({ id, userId: user.id }, { projection: { _id: 0 } });
      return json({ item });
    }
    if (p.startsWith('notes/') && method === 'DELETE') {
      const id = p.split('/')[1];
      await db.collection('notes').deleteOne({ id, userId: user.id });
      return json({ ok: true });
    }

    // ---------- HEALTH ----------
    if (p === 'health/water' && method === 'POST') {
      const b = await request.json();
      const item = { id: uuid(), userId: user.id, ml: Number(b.ml) || 250, date: new Date(), createdAt: new Date() };
      await db.collection('water_logs').insertOne(item);
      return json({ item });
    }
    if (p === 'health/weight' && method === 'POST') {
      const b = await request.json();
      const item = { id: uuid(), userId: user.id, kg: Number(b.kg), date: new Date(), createdAt: new Date() };
      await db.collection('weight_logs').insertOne(item);
      return json({ item });
    }
    if (p === 'health/summary' && method === 'GET') {
      const today = new Date(); today.setHours(0,0,0,0);
      const water = await db.collection('water_logs').find({ userId: user.id, date: { $gte: today } }).toArray();
      const waterTotal = water.reduce((s,w)=>s+w.ml, 0);
      const weights = await db.collection('weight_logs').find({ userId: user.id }, { projection: { _id: 0 } }).sort({ date: -1 }).limit(30).toArray();
      const s = await db.collection('settings').findOne({ userId: user.id, module: 'health' });
      const settings = s?.data || {};
      return json({ waterTotal, waterGoal: settings.waterGoal || 2500, weights, latestWeight: weights[0]?.kg || settings.weight || null, settings });
    }

    // ---------- TRIPS ----------
    if (p === 'trips' && method === 'GET') {
      const items = await db.collection('trips').find({ userId: user.id }, { projection: { _id: 0 } }).sort({ startDate: 1, createdAt: -1 }).limit(200).toArray();
      return json({ items });
    }
    if (p === 'trips' && method === 'POST') {
      const b = await request.json();
      const item = { id: uuid(), userId: user.id, destination: b.destination, country: b.country || '', startDate: b.startDate || null, endDate: b.endDate || null, budget: Number(b.budget) || 0, flights: b.flights || '', hotels: b.hotels || '', notes: b.notes || '', createdAt: new Date() };
      await db.collection('trips').insertOne(item);
      return json({ item });
    }
    if (p.startsWith('trips/') && method === 'PATCH') {
      const id = p.split('/')[1];
      const b = await request.json();
      if (b.budget) b.budget = Number(b.budget);
      await db.collection('trips').updateOne({ id, userId: user.id }, { $set: { ...b, updatedAt: new Date() } });
      const item = await db.collection('trips').findOne({ id, userId: user.id }, { projection: { _id: 0 } });
      return json({ item });
    }
    if (p.startsWith('trips/') && method === 'DELETE') {
      const id = p.split('/')[1];
      await db.collection('trips').deleteOne({ id, userId: user.id });
      return json({ ok: true });
    }

    // ---------- WARDROBE ----------
    if (p === 'wardrobe' && method === 'GET') {
      const items = await db.collection('wardrobe_items').find({ userId: user.id }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(500).toArray();
      return json({ items });
    }
    if (p === 'wardrobe' && method === 'POST') {
      const g = await enforceLimit('wardrobe', 'wardrobe_items'); if (g) return g;
      const b = await request.json();
      const item = { id: uuid(), userId: user.id, name: b.name, brand: b.brand || '', category: b.category || 'top', color: b.color || '', season: b.season || 'all', occasion: b.occasion || '', size: b.size || '', price: Number(b.price) || 0, purchaseDate: b.purchaseDate || null, wearCount: 0, laundry: false, wishlist: b.wishlist || false, notes: b.notes || '', createdAt: new Date() };
      await db.collection('wardrobe_items').insertOne(item);
      return json({ item });
    }
    if (p.startsWith('wardrobe/') && method === 'PATCH') {
      const id = p.split('/')[1];
      const b = await request.json();
      if (b.price) b.price = Number(b.price);
      await db.collection('wardrobe_items').updateOne({ id, userId: user.id }, { $set: { ...b, updatedAt: new Date() } });
      const item = await db.collection('wardrobe_items').findOne({ id, userId: user.id }, { projection: { _id: 0 } });
      return json({ item });
    }
    if (p.startsWith('wardrobe/') && method === 'DELETE') {
      const id = p.split('/')[1];
      await db.collection('wardrobe_items').deleteOne({ id, userId: user.id });
      return json({ ok: true });
    }

    // ---------- DOCUMENTS ----------
    if (p === 'documents' && method === 'GET') {
      const items = await db.collection('documents').find({ userId: user.id }, { projection: { _id: 0, extractedText: 0 } }).sort({ createdAt: -1 }).limit(300).toArray();
      return json({ items });
    }
    if (p === 'documents' && method === 'POST') {
      const g = await enforceLimit('documents', 'documents'); if (g) return g;
      // Multipart upload
      const fs = await import('fs/promises');
      const path = await import('path');
      const formData = await request.formData();
      const file = formData.get('file');
      const category = formData.get('category') || 'other';
      if (!file || typeof file === 'string') return err('No file');
      const buffer = Buffer.from(await file.arrayBuffer());
      const id = uuid();
      const safe = (file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
      const filename = `${id}-${safe}`;
      const userDir = path.join(process.cwd(), 'public', 'uploads', user.id);
      await fs.mkdir(userDir, { recursive: true });
      await fs.writeFile(path.join(userDir, filename), buffer);
      const url = `/uploads/${user.id}/${filename}`;
      // Extract text
      let extractedText = '';
      const mime = file.type || '';
      try {
        if (mime === 'application/pdf' || safe.toLowerCase().endsWith('.pdf')) {
          const pdfParse = (await import('pdf-parse')).default;
          const parsed = await pdfParse(buffer);
          extractedText = (parsed.text || '').slice(0, 20000);
        } else if (mime.startsWith('text/') || /\.(txt|md|csv|json)$/i.test(safe)) {
          extractedText = buffer.toString('utf-8').slice(0, 20000);
        }
      } catch (e) { console.error('extract err', e.message); }
      const doc = { id, userId: user.id, name: file.name, url, mime, size: buffer.length, category, extractedText, createdAt: new Date() };
      await db.collection('documents').insertOne(doc);
      const { extractedText: _, ...rest } = doc;
      return json({ item: rest });
    }
    if (p.startsWith('documents/') && method === 'DELETE') {
      const id = p.split('/')[1];
      const doc = await db.collection('documents').findOne({ id, userId: user.id });
      if (doc?.url) {
        try {
          const fs = await import('fs/promises');
          const path = await import('path');
          await fs.unlink(path.join(process.cwd(), 'public', doc.url));
        } catch {}
      }
      await db.collection('documents').deleteOne({ id, userId: user.id });
      return json({ ok: true });
    }

    // ---------- DASHBOARD ----------
    if (p === 'dashboard' && method === 'GET') {
      const today = new Date(); today.setHours(0,0,0,0);
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
      const [tasks, txs, notes, water, trips, clothes] = await Promise.all([
        db.collection('tasks').find({ userId: user.id }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(10).toArray(),
        db.collection('transactions').find({ userId: user.id, date: { $gte: monthStart } }, { projection: { _id: 0 } }).toArray(),
        db.collection('notes').find({ userId: user.id }, { projection: { _id: 0 } }).sort({ updatedAt: -1 }).limit(5).toArray(),
        db.collection('water_logs').find({ userId: user.id, date: { $gte: today } }).toArray(),
        db.collection('trips').find({ userId: user.id }, { projection: { _id: 0 } }).sort({ startDate: 1 }).limit(3).toArray(),
        db.collection('wardrobe_items').find({ userId: user.id }, { projection: { _id: 0, name: 1, category: 1 } }).limit(100).toArray(),
      ]);
      const spent = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
      const income = txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
      const pendingTasks = tasks.filter(t=>!t.completed).length;
      const waterToday = water.reduce((s,w)=>s+w.ml,0);
      const financeSettings = await db.collection('settings').findOne({ userId: user.id, module: 'finance' });
      const healthSettings = await db.collection('settings').findOne({ userId: user.id, module: 'health' });
      return json({
        stats: { pendingTasks, completedToday: tasks.filter(t=>t.completed).length, spent, income, waterToday, waterGoal: healthSettings?.data?.waterGoal || 2500, monthlyBudget: financeSettings?.data?.monthlyBudget || 0, wardrobeCount: clothes.length },
        tasks, recentTx: txs.slice(0,5), notes, trips,
      });
    }

    // ---------- SUVIO AI ----------
    if (p === 'ai/chat' && method === 'POST') {
      const gDay = await enforceDailyAiLimit(); if (gDay) return gDay;
      const { message, sessionId } = await request.json();
      if (!message) return err('Message required');
      const sid = sessionId || uuid();

      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
      const [tasks, txs, notes, waterToday, weights, history, trips, clothes, docs, memoriesUser] = await Promise.all([
        db.collection('tasks').find({ userId: user.id, completed: false }).limit(15).toArray(),
        db.collection('transactions').find({ userId: user.id, date: { $gte: monthStart } }).toArray(),
        db.collection('notes').find({ userId: user.id }).sort({ updatedAt: -1 }).limit(5).toArray(),
        db.collection('water_logs').find({ userId: user.id, date: { $gte: new Date(new Date().setHours(0,0,0,0)) } }).toArray(),
        db.collection('weight_logs').find({ userId: user.id }).sort({ date: -1 }).limit(3).toArray(),
        db.collection('ai_messages').find({ userId: user.id, sessionId: sid }).sort({ createdAt: 1 }).limit(12).toArray(),
        db.collection('trips').find({ userId: user.id }).limit(5).toArray(),
        db.collection('wardrobe_items').find({ userId: user.id }).toArray(),
        db.collection('documents').find({ userId: user.id }).sort({ createdAt: -1 }).limit(5).toArray(),
        db.collection('users').findOne({ id: user.id }, { projection: { preferences: 1 } }),
      ]);
      const memoryEnabled = memoriesUser?.preferences?.aiMemoryEnabled !== false;
      const memories = memoryEnabled
        ? await db.collection('ai_memory').find({ userId: user.id }).sort({ createdAt: -1 }).limit(20).toArray()
        : [];
      const spent = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
      const byCat = {};
      txs.filter(t=>t.type==='expense').forEach(t => { byCat[t.category] = (byCat[t.category]||0)+t.amount; });
      const topCat = Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([c,v])=>`${c} $${v.toFixed(0)}`).join(', ');
      // Fetch a bit of profile context so the AI knows the user's phone / plan / timezone
      // and can decide whether phone-call scheduling is even possible.
      const dbUser = await db.collection('users').findOne({ id: user.id }, { projection: { _id: 0, phone: 1, phoneVerified: 1, planTier: 1, preferences: 1, reminderSettings: 1 } });
      const tz = dbUser?.reminderSettings?.timezone || dbUser?.preferences?.timezone || 'Asia/Kolkata';
      const nowIso = new Date().toISOString();
      const localNow = new Date().toLocaleString('en-IN', { timeZone: tz, hour12: false });

      const contextBlock = `Live user state:
- Name: ${user.name || user.email}
- Phone: ${dbUser?.phone || 'not set'}${dbUser?.phoneVerified ? ' (verified)' : ' (unverified — cannot place calls)'}
- Plan tier: ${dbUser?.planTier || 'free'}
- Timezone: ${tz} — current local time ${localNow} (ISO now = ${nowIso})
- Open tasks (${tasks.length}): ${tasks.slice(0,5).map(t=>`${t.title}[${t.priority}]`).join(' | ') || 'none'}
- Month spend: $${spent.toFixed(0)}; top: ${topCat || 'none'}
- Water: ${waterToday.reduce((s,w)=>s+w.ml,0)}ml/2500ml; weight: ${weights[0]?.kg || 'n/a'}kg
- Trips: ${trips.map(t=>t.destination).join(', ') || 'none'}
- Wardrobe: ${clothes.length} items
- Notes: ${notes.slice(0,3).map(n=>n.title).join(', ') || 'none'}
- Documents (${docs.length}): ${docs.slice(0,3).map(d=>d.name).join(', ') || 'none'}
${memories.length ? `\nAI Memory (user-approved facts):\n${memories.slice(0,10).map(m=>`- [${m.category}] ${m.content}`).join('\n')}` : ''}
${docs.filter(d=>d.extractedText).slice(0,2).map(d=>`\n--- Document: ${d.name} ---\n${(d.extractedText||'').slice(0,2500)}`).join('\n')}`;

      const systemPrompt = `You are Suvio AI — the user's Chief of Staff for the Suvio personal operating system.

STRICT SCOPE — you can ONLY help with topics inside Suvio:
Dashboard, Finance, Planner/Tasks, Notes, Travel, Wardrobe, Health, Documents, Productivity, Settings, User Data, Website Features, Subscription, Billing, AI Reminder Calls.

Refusal rule: If the user asks about ANYTHING outside those Suvio topics (general knowledge, coding help, world facts, celebrities, recipes, news, other apps, personal opinions, math questions, etc.), respond ONLY with:
"I'm Suvio AI. I can only assist with Suvio features, productivity, planning, finance, travel, health, notes, wardrobe, documents, subscriptions, billing, settings, and other tools available inside Suvio."
Do not attempt to answer the off-topic question. Do not add anything else.

Tool-use policy (be proactive, don't ask for permission for obvious writes):
- The user says "add / create / log / remind me / call me" → CALL the matching tool immediately, then confirm in 1 short line.
- For "call me at 3pm" / "give me a lunch reminder call" / "wake me up at 7 tomorrow" → use schedule_phone_call. ALWAYS compute an ABSOLUTE ISO 8601 timestamp in the user's timezone shown above; NEVER pass relative strings like "in 30 minutes".
- For recurring reminders ("remind me every hour to drink water", "lunch reminder at 1pm daily") → use update_reminder_settings.
- If the user has no verified phone, tell them to add + verify their phone in Settings before scheduling calls — don't call the tool.
- Respect plan tier: water calls need Pro+, meal/workout calls need Premium. If blocked, say so and suggest upgrading.

Style when on-topic: concise, warm, specific. 2-4 short lines. Use bullets for lists. When you've just called a tool, confirm what you did in one short line. Never say "as an AI".

${contextBlock}`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-8).map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: message },
      ];

      let reply = '';
      const executed = [];
      try {
        let resp = await llm.chat.completions.create({
          model: 'gpt-4o-mini-2024-07-18',
          messages,
          tools: TOOLS,
          tool_choice: 'auto',
          temperature: 0.7,
          max_tokens: 400,
        });

        let choice = resp.choices[0].message;
        // If tool calls, execute and re-invoke
        if (choice.tool_calls && choice.tool_calls.length > 0) {
          messages.push(choice);
          for (const call of choice.tool_calls) {
            let args = {};
            try { args = JSON.parse(call.function.arguments || '{}'); } catch {}
            const result = await executeTool(db, user.id, call.function.name, args);
            executed.push({ name: call.function.name, args, result });
            messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
          }
          resp = await llm.chat.completions.create({
            model: 'gpt-4o-mini-2024-07-18',
            messages,
            temperature: 0.7,
            max_tokens: 250,
          });
          reply = resp.choices[0].message.content || 'Done.';
        } else {
          reply = choice.content || '';
        }
      } catch (e) {
        console.error('LLM error', e.message);
        return err('AI unavailable: ' + (e.message || 'unknown'), 500);
      }

      const now = new Date();
      await db.collection('ai_messages').insertMany([
        { id: uuid(), userId: user.id, sessionId: sid, role: 'user', content: message, createdAt: now },
        { id: uuid(), userId: user.id, sessionId: sid, role: 'assistant', content: reply, createdAt: new Date(now.getTime()+1), actions: executed.map(e=>({name:e.name, summary:e.result?.summary})) },
      ]);
      return json({ reply, sessionId: sid, actions: executed });
    }

    if (p === 'ai/history' && method === 'GET') {
      const sid = url.searchParams.get('sessionId');
      if (!sid) {
        const sessions = await db.collection('ai_messages').aggregate([
          { $match: { userId: user.id } },
          { $sort: { createdAt: 1 } },
          { $group: { _id: '$sessionId', last: { $max: '$createdAt' }, count: { $sum: 1 }, first: { $first: '$content' } } },
          { $sort: { last: -1 } },
          { $limit: 100 },
        ]).toArray();
        // Merge in custom titles from ai_sessions collection.
        const ids = sessions.map(s => s._id);
        const titles = ids.length
          ? await db.collection('ai_sessions').find({ userId: user.id, sessionId: { $in: ids } }).toArray()
          : [];
        const titleMap = Object.fromEntries(titles.map(t => [t.sessionId, t.title]));
        const enriched = sessions.map(s => ({ ...s, title: titleMap[s._id] || null }));
        return json({ sessions: enriched });
      }
      const items = await db.collection('ai_messages').find({ userId: user.id, sessionId: sid }, { projection: { _id: 0 } }).sort({ createdAt: 1 }).toArray();
      const sessionDoc = await db.collection('ai_sessions').findOne({ userId: user.id, sessionId: sid });
      return json({ items, title: sessionDoc?.title || null });
    }

    // V2: Rename an AI conversation.
    if (p === 'ai/history' && method === 'PATCH') {
      const { sessionId: sid, title } = await request.json();
      if (!sid) return err('sessionId required');
      const clean = String(title || '').trim().slice(0, 120);
      if (!clean) return err('title required');
      await db.collection('ai_sessions').updateOne(
        { userId: user.id, sessionId: sid },
        { $set: { userId: user.id, sessionId: sid, title: clean, updatedAt: new Date() } },
        { upsert: true }
      );
      return json({ ok: true, title: clean });
    }

    if (p === 'ai/history' && method === 'DELETE') {
      const sid = url.searchParams.get('sessionId');
      if (!sid) return err('sessionId required');
      await db.collection('ai_messages').deleteMany({ userId: user.id, sessionId: sid });
      await db.collection('ai_sessions').deleteOne({ userId: user.id, sessionId: sid });
      return json({ ok: true });
    }

    if (p === 'ai/insights' && method === 'GET') {
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
      const [tasks, txs, water] = await Promise.all([
        db.collection('tasks').find({ userId: user.id, completed: false }).toArray(),
        db.collection('transactions').find({ userId: user.id, date: { $gte: monthStart } }).toArray(),
        db.collection('water_logs').find({ userId: user.id, date: { $gte: new Date(new Date().setHours(0,0,0,0)) } }).toArray(),
      ]);
      const spent = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
      const byCat = {};
      txs.filter(t=>t.type==='expense').forEach(t=>{ byCat[t.category]=(byCat[t.category]||0)+t.amount; });
      const waterMl = water.reduce((s,w)=>s+w.ml,0);
      try {
        const resp = await llm.chat.completions.create({
          model: 'gpt-4o-mini-2024-07-18',
          messages: [
            { role: 'system', content: 'Return ONLY a JSON array of 3 short (<20 words) proactive insights for the user. No prose.' },
            { role: 'user', content: `Tasks:${tasks.length} open. Spend:$${spent.toFixed(0)} (${JSON.stringify(byCat)}). Water:${waterMl}ml/2500ml.` },
          ],
          temperature: 0.6,
          max_tokens: 200,
        });
        const raw = resp.choices[0].message.content.replace(/```json|```/g, '').trim();
        return json({ insights: JSON.parse(raw) });
      } catch (e) {
        return json({ insights: [
          waterMl < 1500 ? `Only ${(waterMl/1000).toFixed(1)}L water today — hydrate.` : 'Great hydration today.',
          tasks.length ? `${tasks.length} open tasks. Knock one out first thing.` : 'No pending tasks — plan tomorrow.',
          spent > 0 ? `Spent $${spent.toFixed(0)} this month.` : 'Log expenses to unlock insights.',
        ] });
      }
    }

    // ---------- V1.2: PLAN ENFORCEMENT / FEATURE GATES ----------
    // (helpers are declared earlier in the request handler)

    if (p === 'plan/status' && method === 'GET') {
      const u = await db.collection('users').findOne({ id: user.id }, { projection: { _id: 0, aiUsage: 1, planTier: 1, plan: 1, planExpiresAt: 1, planSku: 1 } });
      const tier = getTier(u);
      const month = currentMonthKey();
      const usage = u?.aiUsage?.[month] || {};
      const taskCallLimit = callLimitFor(tier, 'taskReminderCallsPerMonth');
      return json({
        tier,
        planExpiresAt: u?.planExpiresAt || null,
        planSku: u?.planSku || null,
        usage: {
          month,
          taskReminderCallsUsed: usage.taskReminderCallsPerMonth || 0,
          taskReminderCallsLimit: taskCallLimit,
        },
        gates: {
          bodyAnalysis: tierAllows(tier, 'bodyAnalysis'),
          aiWorkoutPlan: tierAllows(tier, 'aiWorkoutPlan'),
          aiDietPlan: tierAllows(tier, 'aiDietPlan'),
          waterReminderCalls: tierAllows(tier, 'waterReminderCalls'),
          mealReminderCalls: tierAllows(tier, 'mealReminderCalls'),
          workoutReminderCalls: tierAllows(tier, 'workoutReminderCalls'),
        },
        voiceProviderConfigured: voiceProviderConfigured(),
      });
    }

    // ---------- V1.2: PHONE VERIFICATION (Twilio Verify) ----------
    if (p === 'auth/phone/send' && method === 'POST') {
      const b = await request.json();
      if (!b.phone) return err('phone required');
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const tok = process.env.TWILIO_AUTH_TOKEN;
      const svc = process.env.TWILIO_VERIFY_SERVICE_SID;
      if (!sid || !tok || !svc) {
        // Dev fallback: accept any 6-digit code and store pending phone.
        await db.collection('users').updateOne({ id: user.id }, { $set: { pendingPhone: b.phone } });
        return json({ ok: true, devMode: true, message: 'Twilio Verify not configured — dev mode: use code 000000' });
      }
      const auth = Buffer.from(`${sid}:${tok}`).toString('base64');
      const r = await fetch(`https://verify.twilio.com/v2/Services/${svc}/Verifications`, {
        method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: b.phone, Channel: 'sms' }),
      });
      const d = await r.json();
      if (!r.ok) return err(d?.message || 'Verify send failed', 500);
      await db.collection('users').updateOne({ id: user.id }, { $set: { pendingPhone: b.phone } });
      return json({ ok: true, status: d.status });
    }
    if (p === 'auth/phone/confirm' && method === 'POST') {
      const b = await request.json();
      const dbU = await db.collection('users').findOne({ id: user.id });
      const phone = dbU?.pendingPhone;
      if (!phone) return err('No pending phone', 400);
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const tok = process.env.TWILIO_AUTH_TOKEN;
      const svc = process.env.TWILIO_VERIFY_SERVICE_SID;
      let approved = false;
      if (sid && tok && svc) {
        const auth = Buffer.from(`${sid}:${tok}`).toString('base64');
        const r = await fetch(`https://verify.twilio.com/v2/Services/${svc}/VerificationCheck`, {
          method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ To: phone, Code: String(b.code || '') }),
        });
        const d = await r.json();
        approved = d?.status === 'approved';
      } else {
        // Dev fallback
        approved = String(b.code || '') === '000000';
      }
      if (!approved) return err('Invalid code', 400);
      await db.collection('users').updateOne({ id: user.id }, { $set: { phone, phoneVerified: true }, $unset: { pendingPhone: '' } });
      return json({ ok: true, phone });
    }

    // ---------- V1.2: BODY ANALYSIS (Standard/Premium) ----------
    if (p === 'health/body-analysis' && method === 'GET') {
      const items = await db.collection('body_analyses').find({ userId: user.id }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(50).toArray();
      return json({ items });
    }
    if (p === 'health/body-analysis' && method === 'POST') {
      const dbU = await db.collection('users').findOne({ id: user.id });
      const tier = getTier(dbU);
      if (!tierAllows(tier, 'bodyAnalysis')) return err('AI Body Analysis requires Standard or Premium plan', 402);
      const fs = await import('fs/promises');
      const path = await import('path');
      const formData = await request.formData();
      const goal = formData.get('goal') || 'improve_fitness';
      const files = ['front', 'side'].map(k => formData.get(k)).filter(f => f && typeof f !== 'string');
      if (files.length === 0) return err('At least one image required');
      const uploaded = [];
      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const id = uuid();
        const safe = (file.name || 'body.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
        const filename = `${id}-${safe}`;
        const userDir = path.join(process.cwd(), 'public', 'uploads', user.id, 'body');
        await fs.mkdir(userDir, { recursive: true });
        await fs.writeFile(path.join(userDir, filename), buffer);
        const url = `/uploads/${user.id}/body/${filename}`;
        const b64 = `data:${file.type || 'image/jpeg'};base64,${buffer.toString('base64')}`;
        uploaded.push({ url, b64, mime: file.type });
      }
      // Call vision model (multi-image, structured JSON)
      const goalLabel = { lose_weight: 'Lose Weight', build_muscle: 'Build Muscle', body_recomp: 'Body Recomposition', improve_fitness: 'Improve Fitness' }[goal] || goal;
      const system = `You are Suvio Health AI — a supportive fitness/wellness coach.
Analyze the provided mirror selfie(s) at a visual level only. You are NOT a doctor and this is NOT medical advice.
Return ONLY compact JSON with the following shape and nothing else:
{
  "estimatedBodyFatPct": number,        // rough estimate 8-40
  "bodyType": "ectomorph"|"mesomorph"|"endomorph",
  "posture": string,                     // 1 short sentence
  "muscleBalance": string,               // 1 short sentence
  "weightDistribution": string,          // 1 short sentence
  "observations": string[],              // 3 short bullet points
  "areasToImprove": string[],            // 3 short bullet points
  "disclaimer": "This is an AI visual estimate, not a medical diagnosis."
}
User goal: ${goalLabel}. Be encouraging and specific.`;
      let analysis;
      try {
        const resp = await llm.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: [
              { type: 'text', text: `Please analyze these photos for someone whose primary goal is: ${goalLabel}.` },
              ...uploaded.map(u => ({ type: 'image_url', image_url: { url: u.b64 } })),
            ] },
          ],
          temperature: 0.4,
          max_tokens: 500,
        });
        const raw = resp.choices[0].message.content.replace(/```json|```/g, '').trim();
        analysis = JSON.parse(raw);
      } catch (e) {
        console.error('body-analysis err', e.message);
        analysis = { error: 'Analysis failed — try again with clearer photos.', disclaimer: 'This is an AI visual estimate, not a medical diagnosis.' };
      }
      const doc = { id: uuid(), userId: user.id, goal, images: uploaded.map(u => u.url), analysis, createdAt: new Date() };
      await db.collection('body_analyses').insertOne(doc);
      const { _id, ...rest } = doc;
      return json({ item: rest });
    }

    // ---------- V1.2: WORKOUT PLAN ----------
    if (p === 'health/workout-plan' && method === 'GET') {
      const item = await db.collection('workout_plans').findOne({ userId: user.id }, { projection: { _id: 0 }, sort: { generatedAt: -1 } });
      return json({ item });
    }
    if (p === 'health/workout-plan/generate' && method === 'POST') {
      const dbU = await db.collection('users').findOne({ id: user.id });
      const tier = getTier(dbU);
      if (!tierAllows(tier, 'aiWorkoutPlan')) return err('AI Workout Plan requires Standard or Premium plan', 402);
      const b = await request.json();
      const health = await db.collection('settings').findOne({ userId: user.id, module: 'health' });
      const hs = health?.data || {};
      const goal = b.goal || 'improve_fitness';
      const daysPerWeek = Math.min(7, Math.max(2, Number(b.daysPerWeek) || 4));
      const system = `You are Suvio Fitness AI. Return ONLY JSON (no markdown), matching:
{
  "goal": string,
  "daysPerWeek": number,
  "weeklySchedule": [ { "day":"Mon","focus":"Upper body","exercises":[ {"name":"Push-up","sets":3,"reps":"10-12","rest":"60s","notes":""} ], "cardio":"", "recovery":"" } ],
  "notes": "1-2 short overall tips"
}
Adapt to the user's profile below. Keep exercises safe and progressive.`;
      const profile = `Height:${hs.height||'?'}cm Weight:${hs.weight||'?'}kg Gender:${hs.gender||'?'} Goal:${goal} Days/wk:${daysPerWeek}`;
      let plan;
      try {
        const resp = await llm.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [ { role: 'system', content: system }, { role: 'user', content: profile } ],
          temperature: 0.6, max_tokens: 1200,
        });
        plan = JSON.parse(resp.choices[0].message.content.replace(/```json|```/g, '').trim());
      } catch (e) { return err('Plan generation failed: ' + e.message, 500); }
      const doc = { id: uuid(), userId: user.id, goal, daysPerWeek, plan, generatedAt: new Date() };
      await db.collection('workout_plans').insertOne(doc);
      const { _id, ...rest } = doc;
      return json({ item: rest });
    }

    // ---------- V2.0: AI PERSONAL TRAINER (Premium only) ----------
    // Save a completed workout session with pose-detection stats.
    if (p === 'health/trainer/sessions' && method === 'POST') {
      const dbU = await db.collection('users').findOne({ id: user.id });
      const tier = getTier(dbU);
      if (tier !== 'premium') return err('AI Personal Trainer requires the Premium plan', 402);
      const b = await request.json();
      const durationSec = Math.max(0, Number(b.durationSec) || 0);
      const exercises = Array.isArray(b.exercises) ? b.exercises : [];
      const totalReps = exercises.reduce((s, e) => s + (Number(e.correctReps) || 0), 0);
      const badReps = exercises.reduce((s, e) => s + (Number(e.badReps) || 0), 0);
      const formScore = exercises.length
        ? Math.round(
            exercises.reduce((s, e) => s + (Number(e.avgFormScore) || 0), 0) / exercises.length,
          )
        : 0;
      // Rough MET-based calorie estimate — always disclaimed in the UI.
      const weightKg = Number(b.userWeightKg) || 70;
      const kcal = Math.round((3.5 * weightKg * (durationSec / 60)) / 200 * 5);
      const doc = {
        id: uuid(),
        userId: user.id,
        durationSec,
        exercises,
        totalCorrectReps: totalReps,
        totalBadReps: badReps,
        formScore,
        estimatedKcal: kcal,
        notes: (b.notes || '').slice(0, 500),
        createdAt: new Date(),
      };
      await db.collection('trainer_sessions').insertOne(doc);
      // Fetch the last 5 prior sessions for this user (excluding the one just saved) so the
      // coach's-note LLM can say things like "you're 15% steadier than last week".
      const prior = await db
        .collection('trainer_sessions')
        .find({ userId: user.id, id: { $ne: doc.id } })
        .sort({ createdAt: -1 })
        .limit(5)
        .project({ _id: 0, formScore: 1, totalCorrectReps: 1, totalBadReps: 1, durationSec: 1, exercises: 1, createdAt: 1 })
        .toArray();
      const priorAvgForm = prior.length ? Math.round(prior.reduce((s, p) => s + (p.formScore || 0), 0) / prior.length) : null;
      const priorAvgReps = prior.length ? Math.round(prior.reduce((s, p) => s + (p.totalCorrectReps || 0), 0) / prior.length) : null;
      const formDelta = priorAvgForm !== null ? formScore - priorAvgForm : null;
      const repsDelta = priorAvgReps !== null ? totalReps - priorAvgReps : null;
      // Optional AI-generated coaching summary — LLM may fail silently.
      let coaching = null;
      try {
        const resp = await llm.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                "You are Suvio AI Personal Trainer. Given TODAY'S session and up to 5 prior sessions, write 3-4 short sentences: (1) open with a specific praise or trend callout that USES the numbers ('You're 12% steadier than last week', 'Your rep count is up +4 vs your recent average'), (2) name ONE concrete form fix from the current session's commonIssues, (3) suggest ONE next-workout adjustment (intensity / rest / rep count / add a pause), (4) if there is no prior data, skip step 1 and just praise + fix + suggest. Warm and specific, no filler, no medical claims. Never say 'as an AI'.",
            },
            {
              role: 'user',
              content: JSON.stringify({
                today: {
                  durationSec,
                  formScore,
                  totalCorrectReps: totalReps,
                  totalBadReps: badReps,
                  exercises: exercises.map((e) => ({
                    name: e.name,
                    correctReps: e.correctReps,
                    badReps: e.badReps,
                    avgFormScore: e.avgFormScore,
                    commonIssues: e.commonIssues,
                  })),
                },
                prior_sessions: prior,
                aggregate_deltas: {
                  formDeltaVsPriorAvg: formDelta,
                  repsDeltaVsPriorAvg: repsDelta,
                  priorSessionCount: prior.length,
                },
              }),
            },
          ],
          temperature: 0.6,
          max_tokens: 250,
        });
        coaching = resp.choices?.[0]?.message?.content || null;
      } catch (e) {
        console.warn('trainer coaching LLM failed:', e.message);
      }
      if (coaching) {
        await db
          .collection('trainer_sessions')
          .updateOne({ id: doc.id }, { $set: { coachingSummary: coaching } });
      }
      const { _id, ...rest } = doc;
      return json({ item: { ...rest, coachingSummary: coaching } });
    }

    if (p === 'health/trainer/sessions' && method === 'GET') {
      const dbU = await db.collection('users').findOne({ id: user.id });
      const tier = getTier(dbU);
      if (tier !== 'premium') return err('AI Personal Trainer requires the Premium plan', 402);
      const items = await db
        .collection('trainer_sessions')
        .find({ userId: user.id }, { projection: { _id: 0 } })
        .sort({ createdAt: -1 })
        .limit(30)
        .toArray();
      // Simple streak = consecutive days ending today or yesterday.
      const days = new Set(items.map((s) => new Date(s.createdAt).toISOString().slice(0, 10)));
      let streak = 0;
      const oneDay = 24 * 3600 * 1000;
      let cursor = new Date();
      // If no session today, start from yesterday.
      if (!days.has(cursor.toISOString().slice(0, 10))) cursor = new Date(cursor.getTime() - oneDay);
      while (days.has(cursor.toISOString().slice(0, 10))) {
        streak += 1;
        cursor = new Date(cursor.getTime() - oneDay);
      }
      return json({ items, streak, count: items.length });
    }

    // V2.1 — DELETE a trainer session (user can remove any of their own).
    if (p.startsWith('health/trainer/sessions/') && method === 'DELETE') {
      const id = p.split('/')[3];
      if (!id) return err('Session id required', 400);
      const r = await db.collection('trainer_sessions').deleteOne({ id, userId: user.id });
      if (!r.deletedCount) return err('Session not found', 404);
      return json({ ok: true, deleted: id });
    }

    // ---------- V1.2: DIET PLAN ----------
    if (p === 'health/diet-plan' && method === 'GET') {
      const item = await db.collection('diet_plans').findOne({ userId: user.id }, { projection: { _id: 0 }, sort: { generatedAt: -1 } });
      return json({ item });
    }
    if (p === 'health/diet-plan/generate' && method === 'POST') {
      const dbU = await db.collection('users').findOne({ id: user.id });
      const tier = getTier(dbU);
      if (!tierAllows(tier, 'aiDietPlan')) return err('AI Diet Plan requires Standard or Premium plan', 402);
      const b = await request.json();
      const health = await db.collection('settings').findOne({ userId: user.id, module: 'health' });
      const hs = health?.data || {};
      const goal = b.goal || 'improve_fitness';
      const system = `You are Suvio Nutrition AI. Return ONLY JSON (no markdown), matching:
{
  "goal": string,
  "dailyCalories": number,
  "protein_g": number,
  "carbs_g": number,
  "fats_g": number,
  "waterMl": number,
  "meals": [ { "name":"Breakfast","suggestion":"Oats with berries","kcal":420 } ],
  "notes": "brief nutritional advice"
}`;
      const profile = `Height:${hs.height||'?'}cm Weight:${hs.weight||'?'}kg Gender:${hs.gender||'?'} Age:${hs.dob?Math.floor((Date.now()-new Date(hs.dob))/(365.25*24*3600*1000)):'?'} ActivityLevel:${b.activityLevel||'moderate'} Diet:${b.dietaryPreference||'omnivore'} Restrictions:${(b.restrictions||[]).join(',')||'none'} Goal:${goal}`;
      let plan;
      try {
        const resp = await llm.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [ { role: 'system', content: system }, { role: 'user', content: profile } ],
          temperature: 0.6, max_tokens: 900,
        });
        plan = JSON.parse(resp.choices[0].message.content.replace(/```json|```/g, '').trim());
      } catch (e) { return err('Plan generation failed: ' + e.message, 500); }
      const doc = { id: uuid(), userId: user.id, goal, plan, generatedAt: new Date() };
      await db.collection('diet_plans').insertOne(doc);
      const { _id, ...rest } = doc;
      return json({ item: rest });
    }

    // ---------- V1.2: AI CALL HISTORY ----------
    if (p === 'calls' && method === 'GET') {
      const items = await db.collection('ai_calls').find({ userId: user.id }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(200).toArray();
      return json({ items });
    }

    // ---------- V1.2: REMINDER SETTINGS ----------
    if (p === 'reminders/settings' && method === 'GET') {
      const u = await db.collection('users').findOne({ id: user.id }, { projection: { _id: 0, reminderSettings: 1, phone: 1, phoneVerified: 1 } });
      const defaults = {
        taskFollowup: { enabled: true, hoursBefore: 2, retryOnOverdue: true },
        water: { enabled: false, frequencyMinutes: 60, startHour: 9, endHour: 21, days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], paused: false },
        meals: { enabled: false, breakfast: '08:00', lunch: '13:00', dinner: '20:00', snacks: [], paused: false },
        workout: { enabled: false, days: ['Mon','Wed','Fri'], time: '18:00', minutesBefore: 10, paused: false },
        vacationMode: false,
        timezone: 'Asia/Kolkata',
      };
      return json({ settings: { ...defaults, ...(u?.reminderSettings || {}) }, phone: u?.phone || null, phoneVerified: !!u?.phoneVerified });
    }
    if (p === 'reminders/settings' && method === 'PUT') {
      const b = await request.json();
      const dbU = await db.collection('users').findOne({ id: user.id });
      const tier = getTier(dbU);
      // Enforce feature gates before saving enabled=true.
      if (b.water?.enabled && !tierAllows(tier, 'waterReminderCalls')) return err('Water reminder calls require Pro or higher', 402);
      if (b.meals?.enabled && !tierAllows(tier, 'mealReminderCalls')) return err('Meal reminder calls require Premium', 402);
      if (b.workout?.enabled && !tierAllows(tier, 'workoutReminderCalls')) return err('Workout reminder calls require Premium', 402);
      // V2.1 patch — deep-merge with existing settings so a partial payload
      // (e.g. `{ timezone: 'UTC' }`) can NEVER wipe unrelated sub-objects
      // like `taskFollowup`, `water`, `meals`, or `workout`.
      const existing = dbU?.reminderSettings || {};
      const deepMerge = (base, patch) => {
        if (patch === null || patch === undefined) return base;
        if (Array.isArray(patch)) return patch; // arrays replace wholesale
        if (typeof patch !== 'object' || typeof base !== 'object' || base === null) return patch;
        const out = { ...base };
        for (const k of Object.keys(patch)) out[k] = deepMerge(base[k], patch[k]);
        return out;
      };
      const merged = deepMerge(existing, b);
      await db.collection('users').updateOne({ id: user.id }, { $set: { reminderSettings: merged } });
      // V2.1 — kick off timezone-aware recurring enqueue on every save so the
      // user sees their reminders take effect immediately without waiting for
      // the next cron tick. Non-blocking: swallow any error.
      try {
        const { scheduleRecurringForUser } = await import('@/lib/scheduler');
        const updated = await db.collection('users').findOne({ id: user.id });
        await scheduleRecurringForUser(db, updated, { hoursAhead: 24 });
      } catch (e) { console.warn('recurring reschedule failed:', e.message); }
      return json({ ok: true, settings: merged });
    }

    // ---------- V1.2: TEST REMINDER (enqueue immediately) ----------
    if (p === 'reminders/test-call' && method === 'POST') {
      const b = await request.json();
      const type = b.type || 'water';
      const dbU = await db.collection('users').findOne({ id: user.id });
      if (!dbU.phone || !dbU.phoneVerified) return err('Please verify your phone number first', 400);
      const messages = {
        water: 'Hello! This is Suvio AI. It is time to drink some water. Staying hydrated is important for your health.',
        meal: 'Hello! This is Suvio AI. It is almost time for your meal. Please follow today\'s meal plan.',
        workout: 'Hello! This is Suvio AI. Your workout starts in 10 minutes. Let us stay consistent today.',
        task: 'Hello! This is Suvio AI. You have a task due soon. Please remember to complete it.',
      };
      const r = await enqueueReminder(db, { userId: user.id, type, scheduledFor: new Date(), meta: { message: messages[type], purpose: `${type}_test` } });
      return json({ ok: true, reminder: r });
    }

    // ---------- V1.2: TASK FOLLOW-UP CALL enqueue helper ----------
    if (p.startsWith('tasks/') && p.endsWith('/enable-reminder') && method === 'POST') {
      const id = p.split('/')[1];
      const t = await db.collection('tasks').findOne({ id, userId: user.id });
      if (!t) return err('Task not found', 404);
      if (!t.dueDate) return err('Task has no due date', 400);
      const dbU = await db.collection('users').findOne({ id: user.id });
      if (!dbU.phone || !dbU.phoneVerified) return err('Please verify your phone number first', 400);
      const rs = dbU.reminderSettings?.taskFollowup || { hoursBefore: 2, retryOnOverdue: true };
      const scheduled = new Date(new Date(t.dueDate).getTime() - (Number(rs.hoursBefore) || 2) * 3600 * 1000);
      const r = await enqueueReminder(db, {
        userId: user.id, type: 'task', scheduledFor: scheduled,
        meta: { taskId: t.id, message: `Hello! This is Suvio AI. You have a task due in about ${rs.hoursBefore || 2} hours. Please remember to complete it. Task: ${t.title}.`, purpose: 'task_pre_due' },
      });
      if (rs.retryOnOverdue) {
        const overdue = new Date(new Date(t.dueDate).getTime() + 30 * 60 * 1000);
        await enqueueReminder(db, {
          userId: user.id, type: 'task_followup', scheduledFor: overdue,
          meta: { taskId: t.id, message: `Hello! Your task is now overdue. Task: ${t.title}. You can reply to extend the deadline or delete the task in the Suvio app.`, purpose: 'task_overdue' },
        });
      }
      await db.collection('tasks').updateOne({ id, userId: user.id }, { $set: { reminderReminderId: r.id, reminderEnabled: true } });
      return json({ ok: true, reminder: r });
    }

    // ---------- V1.3: STREAMING AI CHAT (V2: unified Suvio AI with tools + module context) ----------
    if (p === 'ai/chat/stream' && method === 'POST') {
      const gDay = await enforceDailyAiLimit(); if (gDay) return gDay;
      const { message, sessionId } = await request.json();
      if (!message) return err('Message required');
      const sid = sessionId || uuid();

      // Pull full user context (mirrors /api/ai/chat) so streaming AI has the same power.
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
      const [tasks, txs, notes, waterToday, weights, history, trips, clothes, docs, memoriesUser] = await Promise.all([
        db.collection('tasks').find({ userId: user.id, completed: false }).limit(15).toArray(),
        db.collection('transactions').find({ userId: user.id, date: { $gte: monthStart } }).toArray(),
        db.collection('notes').find({ userId: user.id }).sort({ updatedAt: -1 }).limit(5).toArray(),
        db.collection('water_logs').find({ userId: user.id, date: { $gte: new Date(new Date().setHours(0,0,0,0)) } }).toArray(),
        db.collection('weight_logs').find({ userId: user.id }).sort({ date: -1 }).limit(3).toArray(),
        db.collection('ai_messages').find({ userId: user.id, sessionId: sid }).sort({ createdAt: 1 }).limit(12).toArray(),
        db.collection('trips').find({ userId: user.id }).limit(5).toArray(),
        db.collection('wardrobe_items').find({ userId: user.id }).toArray(),
        db.collection('documents').find({ userId: user.id }).sort({ createdAt: -1 }).limit(5).toArray(),
        db.collection('users').findOne({ id: user.id }, { projection: { preferences: 1 } }),
      ]);
      const memoryEnabled = memoriesUser?.preferences?.aiMemoryEnabled !== false;
      const memories = memoryEnabled
        ? await db.collection('ai_memory').find({ userId: user.id }).sort({ createdAt: -1 }).limit(20).toArray()
        : [];
      const spent = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
      const byCat = {};
      txs.filter(t=>t.type==='expense').forEach(t => { byCat[t.category] = (byCat[t.category]||0)+t.amount; });
      const topCat = Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([c,v])=>`${c} $${v.toFixed(0)}`).join(', ');
      const dbUser = await db.collection('users').findOne({ id: user.id }, { projection: { _id: 0, phone: 1, phoneVerified: 1, planTier: 1, preferences: 1, reminderSettings: 1 } });
      const tz = dbUser?.reminderSettings?.timezone || dbUser?.preferences?.timezone || 'Asia/Kolkata';
      const nowIso = new Date().toISOString();
      const localNow = new Date().toLocaleString('en-IN', { timeZone: tz, hour12: false });

      const contextBlock = `Live user state:
- Name: ${user.name || user.email}
- Phone: ${dbUser?.phone || 'not set'}${dbUser?.phoneVerified ? ' (verified)' : ' (unverified — cannot place calls)'}
- Plan tier: ${dbUser?.planTier || 'free'}
- Timezone: ${tz} — current local time ${localNow} (ISO now = ${nowIso})
- Open tasks (${tasks.length}): ${tasks.slice(0,5).map(t=>`${t.title}[${t.priority || 'p3'}]`).join(' | ') || 'none'}
- Month spend: $${spent.toFixed(0)}; top: ${topCat || 'none'}
- Water today: ${waterToday.reduce((s,w)=>s+w.ml,0)}ml; weight: ${weights[0]?.kg || 'n/a'}kg
- Trips: ${trips.map(t=>t.destination).join(', ') || 'none'}
- Wardrobe: ${clothes.length} items
- Notes: ${notes.slice(0,3).map(n=>n.title).join(', ') || 'none'}
- Documents (${docs.length}): ${docs.slice(0,3).map(d=>d.name).join(', ') || 'none'}
${memories.length ? `\nAI Memory (user-approved facts):\n${memories.slice(0,10).map(m=>`- [${m.category}] ${m.content}`).join('\n')}` : ''}`;

      const systemPrompt = `You are Suvio AI — the single, unified assistant for the Suvio personal operating system. Users only ever see "Suvio AI" — never mention underlying models.

SCOPE — you help ONLY with topics inside Suvio:
Dashboard, Finance, Planner/Tasks, Notes, Travel, Wardrobe, Health (workouts, diet, water, weight, body analysis), Documents, Productivity, Settings, User Data, Website Features, Subscription, Billing, AI Reminder Calls.

DECISION ORDER — always follow this order for every user message:
1. IN-SCOPE FACTUAL QUESTION about the user's own Suvio data → ANSWER from the "Live user state" context block below. Never refuse these.
   Examples that MUST be answered (never refuse):
   • "How much water have I had today?" → quote the ml from context.
   • "How many tasks do I have?" / "What are my open tasks?" → list from context.
   • "How much have I spent this month?" / "What's my top category?" → answer from context.
   • "What's my weight?" / "When am I travelling?" / "What notes do I have?" → answer from context.
   • "Am I on Premium?" / "What plan am I on?" → answer from context.
2. ACTION request ("add / create / log / remind me / call me / save / track / delete / update") → use the right tool (see Tool-use policy below).
3. AMBIGUOUS short input with no clear scope ("Book it", "Do it", "Yes", a bare pronoun, or a one-word command with no antecedent) → ask ONE polite clarifying question that offers 2-3 concrete Suvio options. Never refuse a short/ambiguous message without asking first.
   Example: user "Book it" → "Sure — book what? A **task**, a **trip**, or a **reminder call**?"
4. Only after the above three steps rule the message out, apply the REFUSAL rule.

REFUSAL rule: If (and only if) the message clearly asks about something OUTSIDE Suvio — general knowledge, coding help, world facts, celebrities, recipes, news, sports scores, movies, math trivia, historical questions about the wider world, other apps — respond ONLY with:
"I'm Suvio AI. I can only help with things inside Suvio — your tasks, finance, health, notes, travel, wardrobe, documents, reminders, subscription and settings. I can't answer that."
Do NOT attempt to answer the off-topic question. Do NOT add anything else.

Language matching (CRITICAL — always reply in the EXACT SAME language and script the user used):
- **Default: reply in ENGLISH.** Only switch away from English when the user's message clearly contains non-English words.
- English input → English reply. Period. Do not reply in Hinglish/Hindi/other unless the user actually wrote in that language.
- हिन्दी in Devanagari → reply in Devanagari.
- **Hinglish (Hindi words written in Roman/English letters — must contain actual Hindi words like "paani", "khana", "kharcha", "kitna", "kal", "yaar", "mera", "chahiye", "karo", "hua", "raha") → reply in the SAME Hinglish (Roman-script Hindi mixed with English). DO NOT translate to Devanagari, DO NOT switch to pure English.** Examples:
  • User: "log 300ml paani" → "Ho gaya! Maine **300ml paani** log kar diya. Aaj ka total **2460ml** hai."
  • User: "kal 5 baje uthana hai" → "Sure, kal subah 5 baje ke liye call schedule kar dun?"
  • User: "kitna kharcha hua is mahine?" → "Is mahine aapne **₹1,650** kharch kiya hai — mostly Food pe."
- Telugu / Tamil / Kannada / Malayalam / Bengali / Marathi / Gujarati / Punjabi (in their native scripts OR Romanized) → reply in the SAME language and SAME script the user used.
- Spanish/French/German/Portuguese/Japanese/Chinese/Arabic → reply in that language.

Detection rule: If EVERY word in the user's message is a standard English word, the language is English — reply in English. Only classify as Hinglish when clearly-Hindi-phonetic words appear (paani/pani, khana, kharcha, kitna, kaise, kal, aaj, mera, tera, hua, karo, dena, chahiye, yaar, bhai, subah, shaam, raat, ghar, baje, etc.). When in doubt, prefer English.

Formatting: Use Markdown. **Bold** key numbers. Tables for comparisons. Code fences only when the user asks for code. Keep replies concise (2-5 short lines) unless the user asks for detail.

Tool-use policy (BE PROACTIVE — the user WANTS you to change their data):
- User says "add / create / log / remind me / call me / save / track" → CALL the matching tool immediately, then confirm in one short line.
- Fill in reasonable defaults instead of asking (priority='medium', category='personal'/'general', currency = user's default). Ask only if the CORE piece is missing (task title, expense amount, water ml, weight kg, trip destination).
- Parse relative time in the user's timezone to absolute ISO. Weekday names ("Friday", "Monday") → the SOONEST upcoming occurrence (if today IS that weekday, pick next week). "Tomorrow" = today + 1 day. "Next week" = 7 days from today. "In 30 minutes" = now + 30 min.
- Call each tool AT MOST ONCE per user turn. Never re-invoke a tool with the same arguments.
- "I spent ₹500 on lunch" / "I drank 500ml water" / "I bought Nike shoes" / "I'm travelling to Goa next week" → call the appropriate tool, then confirm.
- For "call me at 3pm" / "give me a lunch reminder call" / "wake me up at 7 tomorrow" → use schedule_phone_call with an ABSOLUTE ISO 8601 timestamp in the user's timezone shown above; NEVER pass relative strings.
- For recurring reminders → use update_reminder_settings.
- If the user has no verified phone, tell them to add + verify their phone in Settings before scheduling calls — don't call the tool.
- Respect plan tier: water calls need Pro+, meal/workout calls need Premium. If blocked, say so and suggest upgrading.

Confirmation before destructive actions: Before deleting a task/trip/note/expense/document, ALWAYS ask a yes/no confirmation first. Never delete on first mention.

Health guidance disclaimer: When giving workout, diet, body-analysis or health-coach advice, briefly note "This is informational and not medical advice." on the FIRST such reply per session.

Tone: warm, specific, no filler, no "as an AI".

${contextBlock}`;

      const chatMessages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-8).map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: message },
      ];

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (event, data) => controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          send('sid', { sessionId: sid });
          const executed = [];
          let full = '';
          try {
            // Step 1: non-streaming call with tools to see if the model wants to act.
            let resp = await llm.chat.completions.create({
              model: 'gpt-4o-mini-2024-07-18',
              messages: chatMessages,
              tools: TOOLS,
              tool_choice: 'auto',
              temperature: 0.7,
              max_tokens: 500,
            });
            let choice = resp.choices[0].message;
            if (choice.tool_calls && choice.tool_calls.length > 0) {
              chatMessages.push(choice);
              // Dedupe: same tool + same args in one turn → execute once, but still
              // reply with a matching tool response for every tool_call_id so the
              // follow-up chat completion has the expected 1:1 tool exchange.
              const cache = new Map(); // key -> result
              for (const call of choice.tool_calls) {
                const key = `${call.function.name}::${call.function.arguments || ''}`;
                let result;
                if (cache.has(key)) {
                  result = { ...cache.get(key), duplicate: true };
                } else {
                  let args = {};
                  try { args = JSON.parse(call.function.arguments || '{}'); } catch {}
                  result = await executeTool(db, user.id, call.function.name, args);
                  cache.set(key, result);
                  executed.push({ name: call.function.name, args, result });
                  if (result?.summary) send('action', { name: call.function.name, summary: result.summary });
                }
                chatMessages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
              }
              // Step 2: streaming follow-up so the user sees the reply progressively.
              const stream2 = await llm.chat.completions.create({
                model: 'gpt-4o-mini-2024-07-18',
                messages: chatMessages,
                temperature: 0.7,
                max_tokens: 300,
                stream: true,
              });
              for await (const part of stream2) {
                const delta = part.choices?.[0]?.delta?.content || '';
                if (delta) { full += delta; send('delta', { text: delta }); }
              }
              if (!full) { full = 'Done.'; send('delta', { text: 'Done.' }); }
            } else if (choice.content) {
              // No tool call — chunk the plain text as SSE deltas for a streaming feel.
              full = choice.content;
              const chunks = full.match(/[\s\S]{1,20}/g) || [full];
              for (const c of chunks) send('delta', { text: c });
            } else {
              full = "I'm Suvio AI. Please try rephrasing that.";
              send('delta', { text: full });
            }
            const nowD = new Date();
            await db.collection('ai_messages').insertMany([
              { id: uuid(), userId: user.id, sessionId: sid, role: 'user', content: message, createdAt: nowD },
              { id: uuid(), userId: user.id, sessionId: sid, role: 'assistant', content: full, createdAt: new Date(nowD.getTime()+1), actions: executed.map(e=>({ name: e.name, summary: e.result?.summary })) },
            ]);
            send('done', { ok: true, actions: executed.map(e=>({ name: e.name, summary: e.result?.summary })) });
          } catch (e) {
            console.error('AI stream error', e?.message || e);
            send('error', { error: 'Suvio AI is temporarily unavailable. Please try again in a moment.' });
          } finally { controller.close(); }
        },
      });
      return new NextResponse(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' } });
    }

    return err('Not found: ' + p, 404);
  } catch (e) {
    console.error('API error', e);
    return err(e.message || 'Server error', 500);
  }
}

// ---------- V1.5: SUPPORT / HELP CENTER (public + authed endpoints) ----------
// Attached below the main handler so they are shared by every method export.
async function supportHandle(request) {
  const url = new URL(request.url);
  const method = request.method;
  const p = url.pathname.replace(/^\/api\//, '');
  try {
    // Public endpoints (no auth required).
    if (p === 'support/status' && method === 'GET') {
      // Application-level health checks. We do not currently monitor
      // upstream providers so we report configuration presence only.
      const db = await getDb();
      const nowIso = new Date().toISOString();
      const checks = {};
      try { await db.command({ ping: 1 }); checks.database = 'operational'; }
      catch { checks.database = 'degraded'; }
      checks.authentication = 'operational';
      checks.aiAssistant = process.env.EMERGENT_LLM_KEY ? 'operational' : 'degraded';
      checks.reminderCalls = (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) ? 'operational' : 'not_configured';
      checks.phoneOtp = process.env.TWILIO_VERIFY_SERVICE_SID ? 'operational' : 'not_configured';
      checks.payments = (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) ? 'operational' : 'not_configured';
      checks.documentUploads = 'operational';
      const overall = Object.values(checks).every((s) => s === 'operational' || s === 'not_configured')
        ? 'all_systems_normal'
        : 'degraded';
      return json({ overall, checks, at: nowIso });
    }

    // Auth is optional for support chat — logged-in users get a warmer
    // greeting, anonymous visitors still get answers.
    const authUser = await getUserFromRequest(request).catch(() => null);
    const db = await getDb();

    if (p === 'support/chat' && method === 'POST') {
      const b = await request.json();
      const message = (b.message || '').trim();
      if (!message) return err('Empty message', 400);
      if (message.length > 2000) return err('Message too long', 400);
      // Retrieve top-matching KB articles to ground the answer.
      const matches = searchKB(message).slice(0, 4);
      const kbContext = matches.length
        ? matches.map((a) => `# ${a.title}\n${a.body}`).join('\n\n---\n\n')
        : 'No matching article found.';
      const catalogue = KB.map((a) => `- ${a.title} (${a.slug})`).join('\n');
      const system = `You are **Suvio Support** — a customer-support assistant for the Suvio personal-productivity SaaS.

You are NOT the user's personal Suvio AI. You do NOT execute actions, read user data, modify tasks, or access private information. Your job is guidance and troubleshooting only.

Ground every answer strictly in the knowledge base excerpts below. If the KB does not cover the question, say so honestly and suggest the user file a bug report or feature request from the Help Center's Contact page. Never invent features or contact channels.

Style:
- Friendly, concise, professional.
- Use short paragraphs, bullet points, or numbered steps.
- Reference the article slug in parentheses when you cite it, e.g. "(see: creating-an-account)".
- Do NOT respond to off-topic requests (general trivia, coding help, personal advice). Politely redirect to the Suvio topics you cover.
- Always add: "If this didn't help, use **Contact Support** below to file a bug or feature request."

Knowledge base articles available:
${catalogue}

Relevant excerpts for this question:
${kbContext}`;

      // Session for continuity (optional). Falls back to stateless.
      let session = null;
      const sessionId = b.sessionId || uuid();
      if (authUser) {
        session = await db.collection('support_sessions').findOne({ id: sessionId, userId: authUser.id });
        if (!session) {
          session = { id: sessionId, userId: authUser.id, messages: [], createdAt: new Date() };
          await db.collection('support_sessions').insertOne(session);
        }
      }
      const history = (session?.messages || []).slice(-8);
      const messages = [
        { role: 'system', content: system },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: message },
      ];
      let reply = '';
      try {
        const resp = await llm.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.3,
          max_tokens: 500,
        });
        reply = resp.choices?.[0]?.message?.content || '';
      } catch (e) {
        console.warn('support chat LLM failed:', e.message);
        // Deterministic fallback: return the top KB hit if any.
        if (matches[0]) {
          reply = `**${matches[0].title}**\n\n${matches[0].excerpt}\n\n${matches[0].body}\n\n_Suvio Support AI is temporarily offline — this article was matched by keyword. If it doesn't answer your question, please file a bug from Contact Support._`;
        } else {
          reply = `I'm sorry — Suvio Support is briefly offline. Please try again in a moment, or file a bug from **Contact Support** if the issue persists.`;
        }
      }
      if (session) {
        await db.collection('support_sessions').updateOne(
          { id: sessionId },
          {
            $push: {
              messages: {
                $each: [
                  { role: 'user', content: message, at: new Date() },
                  { role: 'assistant', content: reply, at: new Date() },
                ],
              },
            },
            $set: { updatedAt: new Date() },
          },
        );
      }
      return json({ sessionId, reply, articles: matches.map((a) => ({ slug: a.slug, title: a.title, category: a.category })) });
    }

    // Bug reports + feature requests + feedback all live in one collection.
    if (p === 'support/bug-report' && method === 'POST') {
      const b = await request.json();
      const title = (b.title || '').trim();
      const description = (b.description || '').trim();
      if (!title || title.length < 3) return err('Please add a short title', 400);
      if (!description || description.length < 10) return err('Please describe what happened (min 10 chars)', 400);
      const doc = {
        id: uuid(),
        kind: 'bug',
        userId: authUser?.id || null,
        userEmail: authUser?.email || b.email || null,
        title: title.slice(0, 200),
        description: description.slice(0, 4000),
        category: (b.category || 'general').slice(0, 40),
        steps: (b.steps || '').slice(0, 2000),
        browser: (b.browser || '').slice(0, 200),
        device: (b.device || '').slice(0, 200),
        screenshotUrl: b.screenshotUrl || null,
        appVersion: 'V1.5',
        status: 'open',
        createdAt: new Date(),
      };
      await db.collection('support_reports').insertOne(doc);
      const { _id, ...rest } = doc;
      return json({ ok: true, ticket: rest });
    }

    if (p === 'support/feature-request' && method === 'POST') {
      const b = await request.json();
      const title = (b.title || '').trim();
      if (!title || title.length < 3) return err('Please add a short title', 400);
      const doc = {
        id: uuid(),
        kind: 'feature',
        userId: authUser?.id || null,
        userEmail: authUser?.email || b.email || null,
        title: title.slice(0, 200),
        description: (b.description || '').slice(0, 4000),
        category: (b.category || 'general').slice(0, 40),
        priority: ['low', 'medium', 'high'].includes(b.priority) ? b.priority : 'medium',
        status: 'open',
        createdAt: new Date(),
      };
      await db.collection('support_reports').insertOne(doc);
      const { _id, ...rest } = doc;
      return json({ ok: true, ticket: rest });
    }

    if (p === 'support/feedback' && method === 'POST') {
      const b = await request.json();
      const message = (b.message || '').trim();
      if (!message || message.length < 3) return err('Please share a bit more', 400);
      const doc = {
        id: uuid(),
        kind: 'feedback',
        userId: authUser?.id || null,
        userEmail: authUser?.email || b.email || null,
        rating: [1, 2, 3, 4, 5].includes(Number(b.rating)) ? Number(b.rating) : null,
        description: message.slice(0, 4000),
        status: 'open',
        createdAt: new Date(),
      };
      await db.collection('support_reports').insertOne(doc);
      return json({ ok: true });
    }

    if (p === 'support/kb' && method === 'GET') {
      const q = url.searchParams.get('q');
      if (q) return json({ items: searchKB(q) });
      return json({ items: KB.map(({ body, ...rest }) => rest) });
    }

    return null; // let the outer handler produce the 404
  } catch (e) {
    console.error('Support API error', e);
    return err(e.message || 'Server error', 500);
  }
}

// Wrap `handle` so support routes intercept before the main not-found.
async function routedHandle(request, context) {
  const url = new URL(request.url);
  const p = url.pathname.replace(/^\/api\//, '');
  if (p.startsWith('support/')) {
    const r = await supportHandle(request);
    if (r) return r;
  }
  return handle(request, context);
}

export const GET = routedHandle;
export const POST = routedHandle;
export const PATCH = routedHandle;
export const DELETE = routedHandle;
export const PUT = routedHandle;
