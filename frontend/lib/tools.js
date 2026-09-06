// Tools that Suvio AI can call to create/modify user data
import { v4 as uuid } from 'uuid';
import { enqueueReminder } from './scheduler';
import { getTier, tierAllows } from './plan';

export const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Create a new task in the planner. Use sensible defaults; do NOT ask the user for priority/category — pick medium/general unless the user gave a hint.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short task title' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          category: { type: 'string', description: 'e.g. work, personal, health, finance' },
          dueDate: { type: 'string', description: 'Absolute ISO 8601 date (or datetime) for when the task is due. If the user says "Friday", "tomorrow", "next Monday", compute the exact date in their timezone.' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_expense',
      description: 'Record a financial expense or income.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['expense', 'income'] },
          amount: { type: 'number' },
          category: { type: 'string' },
          note: { type: 'string' },
        },
        required: ['type', 'amount', 'category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_water',
      description: 'Log water intake in millilitres.',
      parameters: {
        type: 'object',
        properties: { ml: { type: 'number', description: 'Millilitres, e.g. 250, 500' } },
        required: ['ml'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_weight',
      description: 'Log a weight measurement in kilograms.',
      parameters: {
        type: 'object',
        properties: { kg: { type: 'number' } },
        required: ['kg'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_note',
      description: 'Create a note.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_trip',
      description: 'Create an upcoming trip.',
      parameters: {
        type: 'object',
        properties: {
          destination: { type: 'string' },
          country: { type: 'string' },
          startDate: { type: 'string', description: 'ISO date' },
          endDate: { type: 'string', description: 'ISO date' },
          budget: { type: 'number' },
        },
        required: ['destination'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_clothing',
      description: 'Add a clothing item to the wardrobe.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          brand: { type: 'string' },
          category: { type: 'string', description: 'top, bottom, shoes, jacket, accessory' },
          color: { type: 'string' },
          season: { type: 'string' },
          price: { type: 'number' },
        },
        required: ['name', 'category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'schedule_phone_call',
      description:
        "Schedule an AI phone call to the user at a specific time. Use this when the user asks Suvio to CALL them (e.g. 'call me at 3pm about the meeting', 'give me a lunch reminder call at 1pm', 'wake me up with a call tomorrow at 7am'). Requires the user to have a verified phone. Subscription rules apply: task/general calls are limited monthly on Free/Pro; water/meal/workout calls require Pro/Premium.",
      parameters: {
        type: 'object',
        properties: {
          scheduledFor: {
            type: 'string',
            description:
              "Absolute ISO 8601 timestamp of when to call (e.g. '2026-01-30T13:00:00+05:30'). Interpret the user's phrase in their timezone. For 'in 30 minutes' or 'tomorrow at 8am', compute the exact ISO time.",
          },
          message: {
            type: 'string',
            description:
              "The exact spoken message the AI should say when the call connects. Keep to 1-3 short sentences, warm and specific. E.g. 'Hi Sushanth, this is Suvio. It's lunch time — please take a break and eat well.'",
          },
          type: {
            type: 'string',
            enum: ['task', 'water', 'meal', 'workout', 'general'],
            description:
              "'general' for one-off calls (interpreted as task-tier limit). Use 'water' / 'meal' / 'workout' when the intent clearly matches so plan gates apply.",
          },
        },
        required: ['scheduledFor', 'message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_reminder_settings',
      description:
        "Turn recurring reminder calls on or off for the user (water / meal / workout). Use when the user says things like 'remind me to drink water every hour', 'set a lunch reminder at 1pm daily', 'stop the water reminders'. Respects subscription: water=Pro+, meal=Premium, workout=Premium.",
      parameters: {
        type: 'object',
        properties: {
          water: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              frequencyMinutes: { type: 'number', description: 'e.g. 60 for hourly' },
              startHour: { type: 'number', description: '0-23' },
              endHour: { type: 'number', description: '0-23' },
            },
          },
          meals: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              breakfast: { type: 'string', description: 'HH:MM 24h' },
              lunch: { type: 'string' },
              dinner: { type: 'string' },
            },
          },
          workout: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              time: { type: 'string', description: 'HH:MM 24h' },
              days: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                },
              },
            },
          },
        },
      },
    },
  },
];

export async function executeTool(db, userId, name, args) {
  const now = new Date();
  switch (name) {
    case 'create_task': {
      let dueDate = null;
      if (args.dueDate) {
        const d = new Date(args.dueDate);
        if (!isNaN(d.getTime())) dueDate = d;
      }
      const item = { id: uuid(), userId, title: args.title, priority: args.priority || 'medium', category: args.category || 'general', dueDate, completed: false, createdAt: now };
      await db.collection('tasks').insertOne(item);
      const when = dueDate ? ` (due ${dueDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })})` : '';
      return { ok: true, id: item.id, summary: `Task "${item.title}"${when} added.` };
    }
    case 'create_expense': {
      const item = { id: uuid(), userId, type: args.type, amount: Number(args.amount), category: args.category, note: args.note || '', date: now, createdAt: now };
      await db.collection('transactions').insertOne(item);
      return { ok: true, id: item.id, summary: `Logged ${item.type}: $${item.amount} (${item.category}).` };
    }
    case 'log_water': {
      const item = { id: uuid(), userId, ml: Number(args.ml), date: now, createdAt: now };
      await db.collection('water_logs').insertOne(item);
      return { ok: true, summary: `Logged ${args.ml}ml water.` };
    }
    case 'log_weight': {
      const item = { id: uuid(), userId, kg: Number(args.kg), date: now, createdAt: now };
      await db.collection('weight_logs').insertOne(item);
      return { ok: true, summary: `Weight logged: ${args.kg}kg.` };
    }
    case 'create_note': {
      const item = { id: uuid(), userId, title: args.title, content: args.content || '', pinned: false, createdAt: now, updatedAt: now };
      await db.collection('notes').insertOne(item);
      return { ok: true, id: item.id, summary: `Note "${item.title}" created.` };
    }
    case 'create_trip': {
      const item = { id: uuid(), userId, destination: args.destination, country: args.country || '', startDate: args.startDate || null, endDate: args.endDate || null, budget: args.budget || 0, notes: '', createdAt: now };
      await db.collection('trips').insertOne(item);
      return { ok: true, id: item.id, summary: `Trip to ${args.destination} created.` };
    }
    case 'create_clothing': {
      const item = { id: uuid(), userId, name: args.name, brand: args.brand || '', category: args.category, color: args.color || '', season: args.season || '', price: args.price || 0, wearCount: 0, createdAt: now };
      await db.collection('wardrobe_items').insertOne(item);
      return { ok: true, id: item.id, summary: `${args.name} added to wardrobe.` };
    }
    case 'schedule_phone_call': {
      const u = await db.collection('users').findOne({ id: userId });
      if (!u?.phone || !u?.phoneVerified) {
        return { ok: false, summary: 'Please verify your phone number in Settings before I can call you.' };
      }
      const type = ['task', 'water', 'meal', 'workout', 'general'].includes(args.type) ? args.type : 'general';
      const tier = getTier(u);
      // Recurring/feature-gated types must respect plan tier.
      const featureKey = { water: 'waterReminderCalls', meal: 'mealReminderCalls', workout: 'workoutReminderCalls' }[type];
      if (featureKey && !tierAllows(tier, featureKey)) {
        return { ok: false, summary: `${type[0].toUpperCase() + type.slice(1)} reminder calls require ${type === 'water' ? 'Pro' : 'Premium'} — you can upgrade in Settings.` };
      }
      const when = new Date(args.scheduledFor);
      if (isNaN(when.getTime()) || when.getTime() < Date.now() - 60_000) {
        return { ok: false, summary: 'That time looks invalid or in the past — try a specific future time (e.g. "in 30 minutes" or "tomorrow at 7 am").' };
      }
      const dbType = type === 'general' ? 'task' : type; // task pipeline handles the monthly limit
      const r = await enqueueReminder(db, {
        userId,
        type: dbType,
        scheduledFor: when,
        meta: { message: args.message, purpose: `ai_${type}_call` },
      });
      // V2.1 — format the confirmation in the user's own timezone so the
      // reply matches the clock they see, regardless of server locale.
      const userTz = u.reminderSettings?.timezone || u.preferences?.timezone || 'Asia/Kolkata';
      let whenFormatted;
      try {
        whenFormatted = when.toLocaleString('en-US', { timeZone: userTz, hour12: false, dateStyle: 'medium', timeStyle: 'short' });
      } catch { whenFormatted = when.toLocaleString('en-IN', { hour12: false }); }
      return {
        ok: true,
        id: r.id,
        summary: `Call scheduled for ${whenFormatted} (${userTz}) — I'll dial ${u.phone}.`,
      };
    }
    case 'update_reminder_settings': {
      const u = await db.collection('users').findOne({ id: userId });
      const tier = getTier(u);
      const current = u?.reminderSettings || {};
      const patch = {};
      const denied = [];
      if (args.water) {
        if (args.water.enabled && !tierAllows(tier, 'waterReminderCalls')) {
          denied.push('water (Pro required)');
        } else {
          patch.water = { ...(current.water || {}), ...args.water };
        }
      }
      if (args.meals) {
        if (args.meals.enabled && !tierAllows(tier, 'mealReminderCalls')) {
          denied.push('meals (Premium required)');
        } else {
          patch.meals = { ...(current.meals || {}), ...args.meals };
        }
      }
      if (args.workout) {
        if (args.workout.enabled && !tierAllows(tier, 'workoutReminderCalls')) {
          denied.push('workout (Premium required)');
        } else {
          patch.workout = { ...(current.workout || {}), ...args.workout };
        }
      }
      if (Object.keys(patch).length === 0) {
        return { ok: false, summary: denied.length ? `Blocked by plan: ${denied.join(', ')}.` : 'Nothing to update.' };
      }
      const next = { ...current, ...patch };
      await db.collection('users').updateOne({ id: userId }, { $set: { reminderSettings: next } });
      const parts = [];
      if (patch.water) parts.push(`water ${patch.water.enabled ? 'on' : 'off'}`);
      if (patch.meals) parts.push(`meals ${patch.meals.enabled ? 'on' : 'off'}`);
      if (patch.workout) parts.push(`workout ${patch.workout.enabled ? 'on' : 'off'}`);
      const summary = `Reminders updated: ${parts.join(', ')}.` + (denied.length ? ` (Blocked: ${denied.join(', ')})` : '');
      return { ok: true, summary };
    }
    default:
      return { ok: false, error: 'Unknown tool' };
  }
}
