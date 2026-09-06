'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, LifeBuoy, ChevronRight, Bug, Sparkles, Activity, Rocket, Shield, Wrench, HelpCircle, ScrollText, FileClock } from 'lucide-react';
import { KB, KB_CATEGORIES, searchKB } from '@/lib/kb';

export default function HelpCenter() {
  const [q, setQ] = useState('');
  const results = useMemo(() => (q.trim() ? searchKB(q) : null), [q]);

  const grouped = useMemo(() => {
    const by = {};
    for (const a of KB) (by[a.category] ||= []).push(a);
    return by;
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-400 to-purple-500 grid place-items-center">
          <LifeBuoy className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold">Help Center</h1>
          <p className="text-sm text-white/50">Guides, troubleshooting, and answers — searchable in one place.</p>
        </div>
      </div>

      {/* Hero search */}
      <div className="mt-8 rounded-2xl glass-strong p-6 md:p-8 border border-white/10">
        <h2 className="text-xl md:text-2xl font-semibold">How can we help you today?</h2>
        <p className="text-sm text-white/50 mt-1">Search our documentation, browse guides, or chat with Suvio Support.</p>
        <div className="mt-4 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Try "OTP not arriving" or "upgrade plan"…'
            className="w-full pl-9 pr-3 py-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:accent-border"
            data-testid="help-search"
            autoFocus
          />
        </div>
        {results && (
          <div className="mt-4 space-y-1.5" data-testid="help-search-results">
            {results.length === 0 && <div className="text-sm text-white/50">No matching articles. Try different keywords or ask Suvio Support below.</div>}
            {results.map((a) => (
              <Link
                key={a.slug}
                href={`/dashboard/help/${a.slug}`}
                className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/5 transition"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{a.title}</div>
                  <div className="text-xs text-white/40 truncate">{a.excerpt}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick action cards */}
      <div className="mt-8 grid gap-3 grid-cols-2 md:grid-cols-4">
        <QuickCard href="/dashboard/help/contact" icon={Bug} label="Report a bug" tone="rose" />
        <QuickCard href="/dashboard/help/contact?tab=feature" icon={Rocket} label="Request a feature" tone="sky" />
        <QuickCard href="/dashboard/help/status" icon={Activity} label="System status" tone="emerald" />
        <QuickCard href="/dashboard/help/privacy" icon={Shield} label="Privacy" tone="purple" />
      </div>

      {/* Extra resource cards */}
      <div className="mt-3 grid gap-3 grid-cols-2 md:grid-cols-4">
        <QuickCard href="/dashboard/help/faq" icon={HelpCircle} label="FAQ" tone="emerald" />
        <QuickCard href="/dashboard/help/troubleshooting" icon={Wrench} label="Troubleshooting" tone="amber" />
        <QuickCard href="/dashboard/help/release-notes" icon={FileClock} label="Release notes" tone="sky" />
        <QuickCard href="/dashboard/help/terms" icon={ScrollText} label="Terms of Service" tone="indigo" />
      </div>

      {/* Categories */}
      <div className="mt-10">
        <div className="text-xs uppercase tracking-widest text-white/40 mb-3">Popular topics</div>
        <div className="grid gap-4 md:grid-cols-2">
          {KB_CATEGORIES.map((cat) => {
            const items = grouped[cat.id] || [];
            if (!items.length) return null;
            return (
              <div key={cat.id} className="rounded-2xl border border-white/10 p-5 glass-strong">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2 h-2 rounded-full bg-${cat.tone}-400`} />
                  <div className="font-semibold text-sm">{cat.label}</div>
                  <div className="ml-auto text-xs text-white/40">{items.length}</div>
                </div>
                <div className="space-y-1">
                  {items.map((a) => (
                    <Link
                      key={a.slug}
                      href={`/dashboard/help/${a.slug}`}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition"
                      data-testid={`help-article-${a.slug}`}
                    >
                      <span className="flex-1 truncate">{a.title}</span>
                      <span className="text-xs text-white/30">{a.read}m</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-12 rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 to-purple-500/5 p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-400 to-purple-500 grid place-items-center">
          <Sparkles className="w-5 h-5 text-black" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Still stuck?</div>
          <div className="text-sm text-white/60">Tap the Support bubble in the bottom-right to chat with Suvio Support — or open Contact to file a bug or feature request.</div>
        </div>
        <Link href="/dashboard/help/contact" className="text-sm accent-bg rounded-lg px-4 py-2 font-semibold hover:opacity-90 transition" data-testid="help-contact-cta">
          Contact
        </Link>
      </div>
    </div>
  );
}

function QuickCard({ href, icon: Icon, label, tone }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-white/10 p-4 hover:bg-white/5 transition group flex items-center gap-3"
      data-testid={`help-quick-${label.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <div className={`w-9 h-9 rounded-lg bg-${tone}-500/10 border border-${tone}-500/30 grid place-items-center`}>
        <Icon className={`w-4 h-4 text-${tone}-300`} />
      </div>
      <div className="text-sm">{label}</div>
      <ChevronRight className="ml-auto w-4 h-4 text-white/30 group-hover:text-white/60 transition" />
    </Link>
  );
}
