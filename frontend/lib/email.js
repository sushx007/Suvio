// Email provider abstraction. Uses Resend when RESEND_API_KEY is set;
// otherwise operates in dev mode (returns a `devLink` the caller can log).
const FROM = process.env.EMAIL_FROM || 'Suvio <no-reply@suvio.ai>';
const RESEND_API_KEY = process.env.RESEND_API_KEY;

export function baseUrl() {
  return (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '') || 'http://localhost:3000';
}

export async function sendEmail({ to, subject, html, text }) {
  if (!RESEND_API_KEY) return { devMode: true, ok: false, reason: 'no_provider' };
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html, text }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: d?.message || 'send failed' };
  return { ok: true, id: d.id };
}

export function verificationEmail(link) {
  return {
    subject: 'Verify your Suvio account',
    text: `Welcome to Suvio! Please verify your email by clicking this link:\n\n${link}\n\nThis link expires in 24 hours.`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#09090B;color:#fff;border-radius:16px">
      <h1 style="font-size:22px;margin:0 0 12px">Welcome to Suvio ✨</h1>
      <p style="color:#c9c9d1;margin:0 0 24px">Confirm your email address to activate your Free Forever account.</p>
      <a href="${link}" style="display:inline-block;background:#fff;color:#000;padding:12px 20px;border-radius:12px;font-weight:600;text-decoration:none">Verify email</a>
      <p style="color:#7a7a86;margin-top:24px;font-size:12px">Or paste this link into your browser:<br/><span style="word-break:break-all">${link}</span></p>
      <p style="color:#7a7a86;margin-top:16px;font-size:12px">This link expires in 24 hours.</p>
    </div>`,
  };
}
