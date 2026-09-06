'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export default function Splash() {
  const [show, setShow] = useState(true);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    // Only show the splash on the marketing root page
    if (typeof window !== 'undefined' && window.location.pathname !== '/') { setShow(false); return; }
    const seen = sessionStorage.getItem('suvio_splash_seen');
    if (seen) { setShow(false); return; }
    // Auto-dismiss after 5 seconds
    const t = setTimeout(() => dismiss(), 5000);
    // Dismiss on scroll or click anywhere
    const onScroll = () => { if (window.scrollY > 20) dismiss(); };
    const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') dismiss(); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  function dismiss() {
    if (dismissing) return;
    setDismissing(true);
    sessionStorage.setItem('suvio_splash_seen', '1');
    setTimeout(() => setShow(false), 700);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: dismissing ? 0 : 1, y: dismissing ? -60 : 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          onClick={dismiss}
          className="fixed inset-0 z-[9999] grid place-items-center overflow-hidden cursor-pointer"
          style={{ background: 'var(--suvio-bg, #09090B)' }}
        >
          {/* Ambient gradient */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-sky-500/20 blur-[120px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-purple-500/20 blur-[100px]" />
          </div>

          <motion.div
            initial={{ scale: 0.5, opacity: 0, filter: 'blur(20px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex flex-col items-center gap-6"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
              className="w-24 h-24 rounded-3xl bg-gradient-to-br from-sky-400 via-indigo-400 to-purple-500 grid place-items-center shadow-[0_0_80px_-10px_rgba(56,189,248,0.6)]"
            >
              <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none">
                <path d="M32 12 L36.5 26.5 L51 32 L36.5 37.5 L32 52 L27.5 37.5 L13 32 L27.5 26.5 Z" fill="white" fillOpacity="0.98"/>
                <circle cx="47" cy="17" r="3" fill="white" fillOpacity="0.95"/>
                <circle cx="17" cy="47" r="2" fill="white" fillOpacity="0.8"/>
              </svg>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-center"
            >
              <div className="text-4xl font-semibold tracking-tight text-gradient">Suvio</div>
              <div className="mt-2 text-xs text-white/50 tracking-widest uppercase">The AI OS for life</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex gap-1.5 mt-2"
            >
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                  className="w-1.5 h-1.5 rounded-full bg-sky-400"
                />
              ))}
            </motion.div>
          </motion.div>

          {/* Scroll-to-enter hint removed per user request */}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
