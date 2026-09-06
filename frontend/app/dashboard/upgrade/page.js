'use client';
import { useEffect, useState, useCallback } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Crown, ArrowLeft, Globe, Shield, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { PLANS, fmtNative as fmt } from '@/lib/currency';
import { CURRENCIES } from '@/lib/preferences';
import { usePreferences } from '@/components/PreferencesProvider';

const TIERS = ['pro', 'standard', 'premium'];

export default function Upgrade() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const { currency, setPreference } = usePreferences();
  const setCurrency = (c) => setPreference('currency', c);
  const [billing, setBilling] = useState('yearly'); // monthly | yearly
  const [loadingId, setLoadingId] = useState(null);
  const [scriptReady, setScriptReady] = useState(false);

  const loadUser = useCallback(() => {
    fetch('/api/me').then(r => r.json()).then(d => setUser(d.user));
  }, []);
  useEffect(() => { loadUser(); }, [loadUser]);

  async function pay(planId) {
    if (!scriptReady && !window.Razorpay) {
      toast.error('Payment gateway is still loading. Please try again in a second.');
      return;
    }
    setLoadingId(planId);
    try {
      const r = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, currency }),
      });
      const order = await r.json();
      if (!r.ok) throw new Error(order.error || 'Could not create order');

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Suvio',
        description: order.planName,
        image: '/logo.svg',
        order_id: order.orderId,
        prefill: { name: user?.name || '', email: user?.email || '' },
        theme: { color: getComputedStyle(document.documentElement).getPropertyValue('--accent-hex').trim() || '#38bdf8' },
        notes: { planId, userId: user?.id || '' },
        // V1.2: For INR, show UPI-only (QR + intent + collect) so Indian users
        // get a scan-to-pay QR code. Other currencies fall back to full checkout.
        ...(order.currency === 'INR' ? {
          method: { upi: true, card: false, netbanking: false, wallet: false, emi: false, paylater: false },
          config: {
            display: {
              blocks: {
                upi: {
                  name: 'Pay with UPI',
                  instruments: [ { method: 'upi', flows: ['qr', 'intent', 'collect'] } ],
                },
              },
              sequence: ['block.upi'],
              preferences: { show_default_blocks: false },
            },
          },
        } : {}),
        handler: async function (resp) {
          try {
            const v = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(resp),
            });
            const vd = await v.json();
            if (!v.ok) throw new Error(vd.error || 'Verification failed');
            toast.success('Payment verified — welcome to Suvio 🎉');
            setTimeout(() => router.push('/dashboard'), 1200);
          } catch (e) {
            toast.error('Verification error: ' + e.message);
          } finally { setLoadingId(null); }
        },
        modal: {
          ondismiss: () => { setLoadingId(null); toast('Payment cancelled', { description: 'You can retry any time.' }); },
        },
      });
      rzp.on('payment.failed', function (resp) {
        toast.error('Payment failed: ' + (resp.error?.description || 'unknown'));
        setLoadingId(null);
      });
      rzp.open();
    } catch (e) {
      toast.error(e.message);
      setLoadingId(null);
    }
  }

  const currentTier = user?.planTier || user?.plan || 'free';

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div className="min-h-full grid-bg">
        <div className="max-w-6xl mx-auto p-8">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition mb-6" data-testid="upgrade-back">
            <ArrowLeft className="w-4 h-4"/> Back
          </button>

          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs accent-text border accent-border mb-6">
              <Crown className="w-3.5 h-3.5"/>
              {currentTier === 'free' ? 'You are on Free Forever' : `Current plan: Suvio ${currentTier.charAt(0).toUpperCase()+currentTier.slice(1)}`}
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-gradient">Upgrade Suvio.</h1>
            <p className="mt-4 text-white/60">Unlock more AI, more storage, deeper analytics and AI phone reminders. Cancel anytime.</p>
          </div>

          {/* Currency + billing toggle */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center gap-2 glass rounded-full px-3 py-1.5">
              <Globe className="w-3.5 h-3.5 text-white/50"/>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="bg-transparent text-sm outline-none" data-testid="currency-select">
                {Object.entries(CURRENCIES).map(([code, c]) => <option key={code} value={code} className="bg-black text-white">{c.symbol} {code} — {c.name}</option>)}
              </select>
            </div>
            <div className="inline-flex glass rounded-full p-1" data-testid="billing-toggle">
              <button onClick={() => setBilling('monthly')} className={`px-4 py-1.5 rounded-full text-sm transition ${billing === 'monthly' ? 'accent-bg' : 'text-white/60'}`}>Monthly</button>
              <button onClick={() => setBilling('yearly')} className={`px-4 py-1.5 rounded-full text-sm transition ${billing === 'yearly' ? 'accent-bg' : 'text-white/60'}`}>Yearly <span className="ml-1 text-[10px] text-emerald-400">Save up to 35%</span></button>
            </div>
          </div>

          {/* Free reminder card */}
          <div className="mt-8 max-w-4xl mx-auto glass rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-white/5 grid place-items-center"><Check className="w-5 h-5 text-emerald-400"/></div>
            <div className="flex-1">
              <div className="text-sm font-semibold">Free Forever plan</div>
              <div className="text-xs text-white/50 mt-0.5">20 tasks · 10 notes · 3 documents · 10 AI msgs/day — always free, no expiry.</div>
            </div>
            {currentTier === 'free' && <div className="text-xs text-emerald-400 font-medium">Current</div>}
          </div>

          {/* Paid Plans (3 tiers) */}
          <div className="mt-6 grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {TIERS.map((tier) => {
              const planId = `${tier}_${billing}`;
              const plan = PLANS[planId];
              if (!plan) return null;
              const price = plan.prices[currency] ?? plan.prices.USD;
              const highlight = tier === 'standard';
              const isCurrent = currentTier === tier;
              return (
                <div key={planId} className={`relative rounded-2xl p-8 ${highlight ? 'glass-strong border-2 accent-border' : 'glass'}`} data-testid={`upgrade-card-${tier}`}>
                  {plan.badge && <div className="absolute -top-3 left-6 text-[10px] font-semibold accent-bg px-2 py-0.5 rounded-full">{plan.badge}</div>}
                  <div className="text-sm text-white/60">Suvio {tier.charAt(0).toUpperCase()+tier.slice(1)}</div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <div className="text-4xl font-semibold tracking-tight">{fmt(price, currency)}</div>
                    <div className="text-sm text-white/40">/ {plan.period}</div>
                  </div>
                  <ul className="mt-6 space-y-2">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-white/80">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5"/>{f}
                      </li>
                    ))}
                  </ul>
                  <button
                    disabled={loadingId === planId || isCurrent}
                    onClick={() => pay(planId)}
                    className={`mt-8 w-full rounded-xl py-3 font-semibold transition flex items-center justify-center gap-2 ${highlight ? 'accent-bg hover:opacity-90' : 'bg-white text-black hover:bg-white/90'} disabled:opacity-50`}
                    data-testid={`upgrade-pay-${tier}`}
                  >
                    {loadingId === planId ? <Loader2 className="w-4 h-4 animate-spin"/> : isCurrent ? 'Current plan' : <><CreditCard className="w-4 h-4"/>Pay with Razorpay</>}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-white/40">
            <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-emerald-400"/>PCI-DSS secure</div>
            <div>UPI · Cards · Wallets · Netbanking · International</div>
          </div>

          <div className="mt-12 max-w-2xl mx-auto grid gap-3">
            {[
              ['Can I cancel anytime?', 'Yes. Paid plans can be cancelled from Settings → Plan & Billing. We compute a fair prorated refund and process it via Razorpay automatically.'],
              ['What happens if I downgrade to Free?', 'You keep all your data. Feature limits apply — for example, creating new items beyond the Free plan cap is blocked until you upgrade again.'],
              ['Do you support UPI / Indian cards?', 'Yes — via Razorpay we accept UPI, cards (Visa/MC/Amex/RuPay), netbanking, and wallets like PhonePe & PayTM.'],
              ['Which currencies work?', 'INR is default, plus USD/EUR/GBP/AED/AUD/CAD/SGD/JPY — Razorpay charges in the currency you pick.'],
            ].map(([q,a],i)=>(
              <div key={i} className="glass rounded-xl p-5">
                <div className="text-sm font-medium">{q}</div>
                <div className="text-sm text-white/50 mt-1">{a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
