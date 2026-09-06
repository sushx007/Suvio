import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export const metadata = { title: 'Privacy Center · Suvio Help' };

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/dashboard/help" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition mb-6" data-testid="privacy-back">
        <ArrowLeft className="w-4 h-4" /> Help Center
      </Link>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-400 to-purple-500 grid place-items-center"><Shield className="w-5 h-5 text-white" /></div>
        <h1 className="text-3xl font-semibold">Privacy Center</h1>
      </div>
      <div className="prose prose-invert max-w-none text-white/80 leading-relaxed space-y-4">
        <p>Suvio is designed to keep your personal data private, secure, and useful to only you. This page summarises what we collect and how it's used. It complements our Terms of Service.</p>

        <h2 className="text-xl font-semibold mt-6">Data we store</h2>
        <ul className="list-disc ml-5 space-y-1">
          <li>Your account: name, verified phone, optional email, hashed password.</li>
          <li>Anything you create inside Suvio: tasks, transactions, notes, trips, wardrobe items, documents, workout sessions.</li>
          <li>AI Memory items you explicitly approve.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6">Data we never share</h2>
        <ul className="list-disc ml-5 space-y-1">
          <li>Your data is never sold, rented, or shared with third parties for marketing.</li>
          <li>Your data is never accessible to other Suvio users.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6">AI Personal Trainer video</h2>
        <p>Pose detection runs entirely in your browser using MediaPipe. Camera frames never leave your device. Only anonymous numeric stats (rep count, form score) are saved.</p>

        <h2 className="text-xl font-semibold mt-6">Phone verification & SMS</h2>
        <p>We use Twilio Verify to send one-time codes to your phone. Twilio's SMS records are subject to Twilio's own privacy policy. We only store the fact that your phone was verified — not any message contents.</p>

        <h2 className="text-xl font-semibold mt-6">Payments</h2>
        <p>All card and UPI details are handled by Razorpay. Suvio only receives a payment success signal and the order metadata — never your card number.</p>

        <h2 className="text-xl font-semibold mt-6">Deleting your account</h2>
        <p>Contact Support (Help Center → Contact → Feedback) to request permanent deletion. We erase everything associated with your account within 30 days.</p>

        <h2 className="text-xl font-semibold mt-6">Data export</h2>
        <p>All API endpoints support authenticated JSON export via <code>GET</code> requests. A one-click export button is on the roadmap.</p>

        <h2 className="text-xl font-semibold mt-6">Security</h2>
        <ul className="list-disc ml-5 space-y-1">
          <li>Passwords are hashed with bcrypt (never stored in plain text).</li>
          <li>Sessions are signed with a server-only secret.</li>
          <li>All communication is over HTTPS.</li>
        </ul>

        <p className="text-xs text-white/40 mt-8">Last updated: 2026-01-12. This page is informational and is not a substitute for a full legal privacy policy — review with counsel before production launch.</p>
      </div>
    </div>
  );
}
