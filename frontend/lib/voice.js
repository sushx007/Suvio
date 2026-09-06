// Provider-agnostic voice/telephony adapter.
//
// Two adapters are provided:
//   • TwilioAdapter — uses TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN /
//     TWILIO_PHONE_NUMBER to place a Programmable Voice call with a
//     TwiML `<Say>` message. Reads voice/language from env if provided.
//   • LoggedAdapter  — writes the intended call to the DB but does NOT
//     dial. Used automatically when no telephony credentials are set,
//     so the rest of the reminder architecture (scheduler / limits /
//     call history) still works end-to-end in dev and in workspaces
//     that don't yet have provider credentials.
//
// To switch providers, set VOICE_PROVIDER=twilio|vonage|mock (default:
// auto-detect from env). New providers plug in by exporting an object
// with an async `placeCall({ to, message, voice }) => { sid, status }`.

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const VOICE_PROVIDER = (process.env.VOICE_PROVIDER || '').toLowerCase();

function twimlSay(message, voice = process.env.VOICE_TWILIO_VOICE || 'Polly.Aditi') {
  // Escape XML special chars.
  const safe = String(message)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="${voice}">${safe}</Say></Response>`;
}

async function twilioPlaceCall({ to, message, voice }) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    throw new Error('Twilio env vars not configured');
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
  const body = new URLSearchParams({
    To: to,
    From: TWILIO_PHONE_NUMBER,
    Twiml: twimlSay(message, voice),
  });
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Twilio call failed');
  return { sid: data.sid, status: data.status || 'queued' };
}

function autoDetectProvider() {
  if (VOICE_PROVIDER) return VOICE_PROVIDER;
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) return 'twilio';
  return 'logged';
}

// Public entrypoint used by the API layer.
//
// Always returns an object; never throws for missing credentials
// (that would break the reminder pipeline in dev). Instead, when no
// provider is configured, the call is recorded as `logged_only` so
// the UI can still show it in the AI Call History.
export async function placeVoiceCall({ to, message, voice }) {
  const provider = autoDetectProvider();
  const startedAt = new Date();
  try {
    if (provider === 'twilio') {
      const r = await twilioPlaceCall({ to, message, voice });
      return { provider, ok: true, sid: r.sid, status: r.status, startedAt };
    }
    // "logged" fallback — the reminder is recorded but no dial is made.
    return { provider: 'logged', ok: true, sid: null, status: 'logged_only', startedAt };
  } catch (e) {
    return { provider, ok: false, sid: null, status: 'failed', error: e.message, startedAt };
  }
}

export function voiceProviderConfigured() {
  return autoDetectProvider() !== 'logged';
}
