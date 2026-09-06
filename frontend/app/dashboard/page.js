'use client';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { CheckCircle2, Wallet, Droplet, Brain, TrendingUp, TrendingDown, Sparkles, ArrowUpRight, Plane, Shirt, Target, Trophy, Sunrise, Sun, Moon, Coffee, Zap, PlusCircle, ListTodo, Receipt, StickyNote, MapPin } from 'lucide-react';
import { usePreferences } from '@/components/PreferencesProvider';
import { toast } from 'sonner';

const fetcher = url => fetch(url).then(r => r.json());

function greetingFor(name) {
  const h = new Date().getHours();
  let greet = 'Hello', Icon = Sun;
  if (h < 5) { greet = 'Still up'; Icon = Moon; }
  else if (h < 12) { greet = 'Good morning'; Icon = Sunrise; }
  else if (h < 17) { greet = 'Good afternoon'; Icon = Sun; }
  else if (h < 21) { greet = 'Good evening'; Icon = Coffee; }
  else { greet = 'Good night'; Icon = Moon; }
  return { greet: `${greet}, ${name}.`, Icon };
}

export default function Overview() {
  const { data: me } = useSWR('/api/me', fetcher);
  const { data } = useSWR('/api/dashboard', fetcher, { refreshInterval: 5000 });
  const { data: full } = useSWR('/api/insights/full', fetcher, { refreshInterval: 30000 });
  const { data: goalsData } = useSWR('/api/goals', fetcher);
  const { data: achv } = useSWR('/api/achievements', fetcher);
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const { format, prefs } = usePreferences();

  useEffect(() => {
    setLoadingInsights(true);
    fetch('/api/ai/insights').then(r=>r.json()).then(d=>setInsights(d.insights)).finally(()=>setLoadingInsights(false));
  }, []);

  const s = data?.stats || {};
  const name = me?.user?.name?.split(' ')[0] || 'there';
  const { greet, Icon } = greetingFor(name);
  const goals = goalsData?.items || [];
  const activeGoals = goals.filter(g => !g.completedAt).slice(0, 3);
  const monthSpent = full?.finance?.monthSpent ?? s.spent ?? 0;
  const spendChange = full?.finance?.spendChange ?? 0;
  const completionRate = full?.productivity?.completionRate ?? 0;
  const waterAvg = full?.health?.waterAvg ?? 0;
  const weightTrend = full?.health?.weightTrend ?? 0;
  const dailySeries = full?.finance?.dailySeries || [];
  const unlockedCount = achv?.unlocked || 0;

  async function quickAdd(type) {
    if (type === 'water') {
      await fetch('/api/health/water', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ml: 250 }) });
      toast.success('Logged 250ml water');
    } else if (type === 'expense') {
      const amount = prompt('Amount:'); if (!amount) return;
      const category = prompt('Category (food/transport/etc):') || 'other';
      await fetch('/api/transactions', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type:'expense', amount, category }) });
      toast.success('Expense logged');
    } else if (type === 'task') {
      const title = prompt('Task title:'); if (!title) return;
      await fetch('/api/tasks', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title, priority:'medium' }) });
      toast.success('Task added');
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Personalized greeting */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl accent-bg/20 grid place-items-center" style={{ background: 'rgba(var(--accent-rgb), 0.15)' }}>
            <Icon className="w-6 h-6 accent-text"/>
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{greet}</h1>
            <p className="text-white/50 text-sm mt-1">
              {new Date().toLocaleDateString(prefs.numberFormat, { weekday: 'long', month: 'long', day: 'numeric' })}
              {' · '}
              {s.pendingTasks ? `${s.pendingTasks} tasks pending` : 'no tasks pending'}
              {activeGoals.length ? ` · ${activeGoals.length} active goals` : ''}
            </p>
          </div>
        </div>
        {/* Quick actions */}
        <div className="flex gap-2 flex-wrap">
          <QuickAction icon={ListTodo} label="Add task" onClick={()=>quickAdd('task')} />
          <QuickAction icon={Receipt} label="Log expense" onClick={()=>quickAdd('expense')} />
          <QuickAction icon={Droplet} label="+250ml" onClick={()=>quickAdd('water')} />
          <Link href="/dashboard/ai" className="text-sm accent-bg text-white rounded-lg px-3 py-2 font-medium hover:opacity-90 transition flex items-center gap-2">
            <Brain className="w-4 h-4"/> Ask Suvio
          </Link>
        </div>
      </div>

      {/* AI Insights */}
      <div className="glass-strong rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 text-sm text-white/60 mb-4">
          <Brain className="w-4 h-4 accent-text" />
          <span className="font-medium text-white/90">Suvio AI · Today's Insights</span>
          <div className="ml-auto text-xs px-2 py-0.5 rounded-full text-white" style={{ background: 'rgba(var(--accent-rgb), 0.15)', color: 'var(--accent-hex)' }}>Live</div>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {loadingInsights && [1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-white/5 shimmer" />)}
          {!loadingInsights && insights?.map((t, i) => (
            <div key={i} className="glass rounded-xl p-4 text-sm text-white/80 flex gap-3">
              <Sparkles className="w-4 h-4 accent-text shrink-0 mt-0.5" />
              <span>{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={CheckCircle2} tint="text-sky-400" label="Open tasks" value={s.pendingTasks ?? '—'} sub={`${Math.round(completionRate)}% completion rate`} />
        <StatCard
          icon={Wallet}
          tint="text-emerald-400"
          label="Spent this month"
          value={format(monthSpent)}
          sub={
            spendChange !== 0 ? (
              <span className="inline-flex items-center gap-1">
                {spendChange > 0 ? <TrendingUp className="w-3 h-3 text-rose-400"/> : <TrendingDown className="w-3 h-3 text-emerald-400"/>}
                <span className={spendChange > 0 ? 'text-rose-400' : 'text-emerald-400'}>{Math.abs(spendChange).toFixed(0)}%</span>
                <span className="text-white/40">vs last month</span>
              </span>
            ) : (s.monthlyBudget ? `of ${format(s.monthlyBudget)} budget` : `+${format(s.income||0)} income`)
          }
        />
        <StatCard icon={Droplet} tint="text-cyan-400" label="Water today" value={`${((s.waterToday||0)/1000).toFixed(1)}L`} sub={`avg ${(waterAvg/1000).toFixed(1)}L · goal ${((s.waterGoal||2500)/1000).toFixed(1)}L`} progress={(s.waterToday||0)/(s.waterGoal||2500)} />
        <StatCard icon={Trophy} tint="accent-text" label="Achievements" value={unlockedCount} sub={`${achv?.total || 0} total badges`} />
      </div>

      {/* Spending sparkline */}
      {dailySeries.length > 0 && (
        <div className="glass rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-medium text-white/80">30-day spending trend</div>
              <div className="text-xs text-white/40">Total: {format(monthSpent)}</div>
            </div>
            <Link href="/dashboard/finance" className="text-xs accent-text hover:underline flex items-center gap-1">View finance <ArrowUpRight className="w-3 h-3"/></Link>
          </div>
          <Sparkline data={dailySeries} format={format} />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Active Goals */}
        <Panel title="Active Goals" href="/dashboard/goals" icon={Target}>
          {activeGoals.length ? activeGoals.map(g => {
            const prog = Math.min(1, (g.current||0) / (g.target||1));
            return (
              <div key={g.id} className="py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="truncate">{g.title}</span>
                  <span className="text-xs accent-text font-medium">{Math.round(prog*100)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full accent-bg transition-all duration-500" style={{ width: `${prog*100}%` }}/>
                </div>
              </div>
            );
          }) : <Empty label="No active goals. Set one to unlock personalized AI." href="/dashboard/goals" cta="Create goal"/>}
        </Panel>

        {/* Upcoming Tasks */}
        <Panel title="Upcoming Tasks" href="/dashboard/planner" icon={CheckCircle2}>
          {data?.tasks?.length ? data.tasks.slice(0,6).map(t => (
            <div key={t.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
              <div className={`w-1.5 h-1.5 rounded-full ${t.priority==='high'?'bg-rose-400':t.priority==='low'?'bg-white/30':'accent-bg'}`} />
              <span className={`text-sm ${t.completed?'line-through text-white/30':''}`}>{t.title}</span>
              <span className="ml-auto text-xs text-white/40">{t.category}</span>
            </div>
          )) : <Empty label="No tasks yet. Press ⌘K to add one." />}
        </Panel>

        {/* Recent Transactions */}
        <Panel title="Recent Transactions" href="/dashboard/finance" icon={Wallet}>
          {data?.recentTx?.length ? data.recentTx.map(t => (
            <div key={t.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
              <div className={`w-8 h-8 rounded-lg grid place-items-center ${t.type==='income'?'bg-emerald-500/10 text-emerald-400':'bg-rose-500/10 text-rose-400'}`}>{t.type==='income' ? '+' : '−'}</div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{t.note || t.category}</div>
                <div className="text-xs text-white/40">{t.category}</div>
              </div>
              <div className={`text-sm font-semibold ${t.type==='income'?'text-emerald-400':'text-white/90'}`}>{format(t.amount)}</div>
            </div>
          )) : <Empty label="No transactions yet." />}
        </Panel>

        {/* Upcoming Trips */}
        <Panel title="Upcoming Trips" href="/dashboard/travel" icon={Plane}>
          {data?.trips?.length ? data.trips.map(t => (
            <div key={t.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
              <MapPin className="w-4 h-4 accent-text"/>
              <span className="text-sm">{t.destination}</span>
              <span className="text-xs text-white/40 ml-auto">{t.startDate ? new Date(t.startDate).toLocaleDateString() : ''}</span>
            </div>
          )) : <Empty label="No trips planned yet." href="/dashboard/travel" cta="Plan a trip"/>}
        </Panel>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} className="text-sm glass hover:bg-white/10 rounded-lg px-3 py-2 transition flex items-center gap-2">
      <Icon className="w-4 h-4"/> {label}
    </button>
  );
}

function StatCard({ icon: Icon, tint, label, value, sub, progress }) {
  return (
    <div className="glass rounded-2xl p-5 hover:bg-white/[0.04] transition">
      <Icon className={`w-4 h-4 ${tint} mb-4`} />
      <div className="text-xs text-white/50">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      <div className="text-xs text-white/40 mt-1">{sub}</div>
      {progress !== undefined && (
        <div className="mt-3 h-1 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full accent-bg" style={{ width: `${Math.min(progress*100,100)}%` }} />
        </div>
      )}
    </div>
  );
}

function Panel({ title, href, icon: Icon, children }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white/80 flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 accent-text"/>}
          {title}
        </h3>
        {href && <Link href={href} className="text-xs text-white/40 hover:text-white flex items-center gap-1 transition">Open <ArrowUpRight className="w-3 h-3"/></Link>}
      </div>
      {children}
    </div>
  );
}

function Empty({ label, href, cta }) {
  return (
    <div className="text-sm text-white/40 py-6 text-center">
      <div>{label}</div>
      {href && cta && <Link href={href} className="mt-2 inline-block text-xs accent-text hover:underline">{cta} →</Link>}
    </div>
  );
}

function Sparkline({ data, format }) {
  if (!data.length) return null;
  const max = Math.max(1, ...data.map(d => d.value));
  const width = 100 / data.length;
  return (
    <div className="relative h-32">
      <div className="absolute inset-0 flex items-end gap-[2px]">
        {data.map((d, i) => {
          const h = Math.max(2, (d.value / max) * 100);
          return (
            <div key={d.date} className="flex-1 group relative" style={{ height: `${h}%` }}>
              <div className="w-full h-full rounded-t transition-all group-hover:opacity-100 opacity-70" style={{ background: `linear-gradient(to top, var(--accent-hex), rgba(var(--accent-rgb), 0.2))` }} />
              <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap text-[10px] bg-black/80 text-white px-2 py-1 rounded pointer-events-none z-10">
                {d.date.slice(5)}: {format(d.value)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
