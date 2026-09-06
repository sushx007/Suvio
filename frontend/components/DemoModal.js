'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, CheckCircle2, Wallet, Droplet, Plane, Sparkles } from 'lucide-react';

const SCENES = [
  {
    id: 'expense',
    userMsg: 'Log ₹1,200 dinner at restaurants',
    aiMsg: 'Done — logged ₹1,200 to restaurants. That brings your food spend this month to ₹4,400.',
    action: { icon: Wallet, tint: 'bg-emerald-500/15 text-emerald-400', title: 'Dinner', sub: '₹1,200 · restaurants', badge: 'Finance updated' },
  },
  {
    id: 'task',
    userMsg: 'Add a high-priority task to prep the quarterly report',
    aiMsg: 'Added "Prep quarterly report" with high priority. Want me to block time on your calendar too?',
    action: { icon: CheckCircle2, tint: 'bg-sky-500/15 text-sky-400', title: 'Prep quarterly report', sub: 'high · work', badge: 'Task created' },
  },
  {
    id: 'water',
    userMsg: 'Log 500ml water',
    aiMsg: '+500ml logged. You are at 1.5L / 2.5L today. Halfway there!',
    action: { icon: Droplet, tint: 'bg-cyan-500/15 text-cyan-400', title: 'Water', sub: '1.5L / 2.5L', badge: 'Health logged' },
  },
  {
    id: 'trip',
    userMsg: 'Plan a 4-day trip to Goa in December, budget ₹40,000',
    aiMsg: 'Trip to Goa created for December. Want me to draft a packing list based on the weather?',
    action: { icon: Plane, tint: 'bg-amber-500/15 text-amber-400', title: 'Goa · India', sub: 'Dec · ₹40,000', badge: 'Trip added' },
  },
];

export default function DemoModal({ open, onOpenChange }) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState('typing'); // typing → thinking → action → hold

  useEffect(() => {
    if (!open) { setIdx(0); setPhase('typing'); return; }
    const s = SCENES[idx];
    const timers = [];
    setPhase('typing');
    timers.push(setTimeout(() => setPhase('thinking'), s.userMsg.length * 30 + 300));
    timers.push(setTimeout(() => setPhase('action'), s.userMsg.length * 30 + 900));
    timers.push(setTimeout(() => setPhase('hold'), s.userMsg.length * 30 + 1600));
    timers.push(setTimeout(() => setIdx(i => (i + 1) % SCENES.length), s.userMsg.length * 30 + 3800));
    return () => timers.forEach(clearTimeout);
  }, [open, idx]);

  if (!open) return null;
  const scene = SCENES[idx];
  const typedLen = phase === 'typing' ? Math.floor((Date.now() % (scene.userMsg.length * 30 + 300)) / 30) : scene.userMsg.length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] grid place-items-center bg-black/80 backdrop-blur-md px-4"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-3xl aspect-video rounded-2xl bg-[#0c0c10] border border-white/10 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="absolute top-0 inset-x-0 h-10 border-b border-white/5 flex items-center px-4 gap-2 bg-black/30 z-10">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-400/70"/>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400/70"/>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/70"/>
              </div>
              <div className="text-xs text-white/40 mx-auto">Suvio · Live demo</div>
              <button onClick={() => onOpenChange(false)} className="text-white/50 hover:text-white transition"><X className="w-4 h-4"/></button>
            </div>

            {/* Content */}
            <div className="pt-14 pb-6 px-8 h-full flex flex-col justify-between">
              <div className="flex-1 flex flex-col gap-4">
                {/* User bubble */}
                <div className="self-end max-w-[80%]">
                  <div className="bg-sky-500 text-white rounded-2xl px-4 py-2.5 text-sm">
                    {scene.userMsg.slice(0, typedLen)}
                    {phase === 'typing' && <span className="inline-block w-1 h-4 bg-white/70 ml-0.5 animate-pulse align-middle"/>}
                  </div>
                </div>

                {/* Assistant bubble */}
                {phase !== 'typing' && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 max-w-[85%]">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-purple-500 grid place-items-center shrink-0">
                      <Brain className={`w-4 h-4 text-white ${phase==='thinking'?'animate-pulse':''}`}/>
                    </div>
                    <div className="glass rounded-2xl px-4 py-2.5 text-sm text-white/90">
                      {phase === 'thinking' ? (
                        <span className="flex gap-1">
                          {[0,1,2].map(i => <motion.span key={i} animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i*0.15 }} className="w-1.5 h-1.5 rounded-full bg-white/60"/>)}
                        </span>
                      ) : scene.aiMsg}
                    </div>
                  </motion.div>
                )}

                {/* Action card */}
                {(phase === 'action' || phase === 'hold') && (
                  <motion.div initial={{ opacity: 0, scale: 0.9, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', damping: 20 }} className="mt-2 ml-10 max-w-sm">
                    <div className="glass-strong rounded-xl p-4 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg grid place-items-center ${scene.action.tint}`}>
                        <scene.action.icon className="w-5 h-5"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{scene.action.title}</div>
                        <div className="text-xs text-white/50 truncate">{scene.action.sub}</div>
                      </div>
                      <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider whitespace-nowrap">{scene.action.badge}</div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Scene dots + label */}
              <div className="flex items-center justify-between pt-4">
                <div className="text-xs text-white/40 flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-sky-400"/> Suvio AI creates things from natural language.
                </div>
                <div className="flex gap-1.5">
                  {SCENES.map((_, i) => (
                    <div key={i} className={`h-1 rounded-full transition-all ${i===idx ? 'w-8 bg-sky-400' : 'w-2 bg-white/20'}`}/>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
