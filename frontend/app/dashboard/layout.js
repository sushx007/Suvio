'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, CheckCircle2, Wallet, StickyNote, Heart, Brain, Sparkles, LogOut, Search, Plane, Shirt, Settings, Zap, Crown, FileText, Target, Trophy, Bell, PhoneCall, LifeBuoy } from 'lucide-react';
import { toast } from 'sonner';
import CommandPalette from '@/components/CommandPalette';
import AddPhonePrompt from '@/components/AddPhonePrompt';
import SupportWidget from '@/components/SupportWidget';

const nav = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/ai', label: 'Suvio AI', icon: Brain, accent: true },
  { href: '/dashboard/planner', label: 'Planner', icon: CheckCircle2 },
  { href: '/dashboard/goals', label: 'Goals', icon: Target },
  { href: '/dashboard/finance', label: 'Finance', icon: Wallet },
  { href: '/dashboard/health', label: 'Health', icon: Heart },
  { href: '/dashboard/wardrobe', label: 'Wardrobe', icon: Shirt },
  { href: '/dashboard/travel', label: 'Travel', icon: Plane },
  { href: '/dashboard/notes', label: 'Notes', icon: StickyNote },
  { href: '/dashboard/documents', label: 'Documents', icon: FileText },
  { href: '/dashboard/reminders', label: 'Reminders', icon: Bell },
  { href: '/dashboard/calls', label: 'AI Calls', icon: PhoneCall },
  { href: '/dashboard/achievements', label: 'Achievements', icon: Trophy },
  { href: '/dashboard/help', label: 'Help Center', icon: LifeBuoy },
];

const SIDEBAR_KEY = 'suvio.sidebar.open';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const asideRef = useRef(null);
  const logoRef = useRef(null);

  // Hydrate — always start closed on load for a cleaner canvas.
  useEffect(() => { setOpen(false); }, []);

  // Persist last state (optional convenience — but sidebar stays closed on
  // fresh loads to satisfy V1.3 "not visible until logo clicked" behaviour).
  useEffect(() => { try { localStorage.setItem(SIDEBAR_KEY, open ? '1' : '0'); } catch {} }, [open]);

  // Close on route change.
  useEffect(() => { setOpen(false); }, [pathname]);

  // Close when clicking anywhere outside the sidebar or the logo.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      const a = asideRef.current, l = logoRef.current;
      if (a && a.contains(e.target)) return;
      if (l && l.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    fetch('/api/me').then(r => r.ok ? r.json() : Promise.reject()).then(d => setUser(d.user)).catch(() => router.push('/login'));
  }, [router, pathname]);

  useEffect(() => {
    const h = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(o => !o); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    toast.success('Signed out'); router.push('/');
  }

  const tier = user?.planTier || user?.plan || 'free';
  const isPaid = ['pro', 'standard', 'premium'].includes(tier) && user?.planStatus === 'pro';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--suvio-bg)' }}>
      {/* Fixed top bar */}
      <header className="fixed top-0 inset-x-0 z-40 h-16 border-b backdrop-blur px-6 flex items-center gap-3" style={{ borderColor: 'var(--suvio-border)', background: 'color-mix(in oklab, var(--suvio-bg) 82%, transparent)' }}>
        {/* Logo — clickable, toggles the drawer sidebar. */}
        <button
          ref={logoRef}
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition"
          data-testid="sidebar-toggle"
          aria-expanded={open}
          aria-label="Toggle navigation"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-purple-500 grid place-items-center shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold hidden sm:inline">Suvio</span>
          {isPaid && <span className="ml-1 text-[10px] font-semibold bg-gradient-to-r from-sky-400 to-purple-500 text-black px-1.5 py-0.5 rounded uppercase">{tier}</span>}
        </button>

        <button onClick={() => setPaletteOpen(true)} className="ml-4 hidden md:flex items-center gap-2 text-sm text-white/50 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 transition min-w-[220px]">
          <Search className="w-3.5 h-3.5" /><span>Quick actions</span>
          <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-white/10">⌘K</kbd>
        </button>

        <div className="ml-auto flex items-center gap-3">
          {isPaid && (
            <div className="hidden sm:flex text-xs text-emerald-400 items-center gap-2"><Crown className="w-3.5 h-3.5"/><span>Suvio {tier.charAt(0).toUpperCase()+tier.slice(1)}</span></div>
          )}
          {!isPaid ? (
            <Link href="/dashboard/upgrade" className="flex items-center gap-2 text-sm bg-gradient-to-r from-sky-400 to-purple-500 text-black hover:opacity-90 rounded-lg px-3.5 py-1.5 font-semibold transition shadow-lg shadow-sky-500/20" data-testid="topbar-upgrade">
              <Zap className="w-3.5 h-3.5"/><span className="hidden sm:inline">Upgrade Suvio</span>
            </Link>
          ) : (
            <Link href="/dashboard/upgrade" className="text-xs text-white/50 hover:text-white transition">Manage plan</Link>
          )}
        </div>
      </header>

      {/* Backdrop (fades in with sidebar) */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden
        data-testid="sidebar-backdrop"
      />

      {/* Slide-out sidebar (drawer). Fully hidden until the logo is clicked. */}
      <aside
        ref={asideRef}
        className={`fixed top-16 bottom-0 left-0 z-50 w-72 border-r flex flex-col transition-transform duration-300 will-change-transform ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ borderColor: 'var(--suvio-border)', background: 'var(--suvio-surface-strong)' }}
        data-testid="dashboard-sidebar"
      >
        <nav className="mt-4 px-2 space-y-0.5 flex-1 overflow-y-auto scrollbar-thin">
          {nav.map(n => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${active ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'} ${n.accent && !active ? 'text-sky-300' : ''}`}
                data-testid={`nav-${n.href.split('/').pop() || 'overview'}`}
              >
                <n.icon className="w-4 h-4 shrink-0" />
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>

        {!isPaid && (
          <div className="mx-3 mb-3 rounded-xl bg-gradient-to-br from-sky-500/20 via-indigo-500/10 to-purple-500/10 p-4 border border-sky-500/20">
            <Crown className="w-4 h-4 text-sky-300 mb-2"/>
            <div className="text-sm font-semibold">You're on Free</div>
            <div className="text-xs text-white/60 mt-0.5">Unlock more AI, storage & analytics</div>
            <Link href="/dashboard/upgrade" className="mt-3 block text-center bg-white text-black rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-white/90 transition" data-testid="sidebar-upgrade-cta">Upgrade Suvio</Link>
          </div>
        )}

        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/settings"
              className={`flex-1 min-w-0 flex items-center gap-3 px-2 py-2 rounded-lg transition ${
                pathname === '/dashboard/settings'
                  ? 'bg-white/10'
                  : 'hover:bg-white/5'
              }`}
              title="Account & settings"
              data-testid="sidebar-account"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-purple-500 grid place-items-center text-sm font-semibold shrink-0">
                {(user?.name || user?.email || user?.phone || '?')[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-medium truncate">{user?.name || 'You'}</div>
                <div className="text-xs text-white/40 truncate">
                  {user?.email || user?.phone || 'Account & settings'}
                </div>
              </div>
            </Link>
            <button
              onClick={logout}
              className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition shrink-0"
              title="Sign out"
              data-testid="sidebar-logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content — full width, no reserved sidebar space */}
      <main className="pt-16 flex-1 overflow-y-auto scrollbar-thin">
        {children}
      </main>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <AddPhonePrompt user={user} />
      <SupportWidget />
    </div>
  );
}
