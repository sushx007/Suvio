'use client';
import { motion } from 'framer-motion';

export default function LogoLoader({ label = 'Loading…' }) {
  return (
    <div className="min-h-[60vh] w-full grid place-items-center">
      <div className="flex flex-col items-center gap-5">
        <motion.div
          animate={{ scale: [1, 1.06, 1], rotate: [0, 3, -3, 0] }}
          transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 via-indigo-400 to-purple-500 grid place-items-center shadow-[0_0_60px_-10px_rgba(56,189,248,0.6)]"
        >
          <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none">
            <path d="M32 12 L36.5 26.5 L51 32 L36.5 37.5 L32 52 L27.5 37.5 L13 32 L27.5 26.5 Z" fill="white" fillOpacity="0.98"/>
            <circle cx="47" cy="17" r="3" fill="white" fillOpacity="0.95"/>
            <circle cx="17" cy="47" r="2" fill="white" fillOpacity="0.8"/>
          </svg>
        </motion.div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
              className="w-1.5 h-1.5 rounded-full bg-sky-400"
            />
          ))}
        </div>
        <div className="text-xs text-white/50 tracking-widest uppercase">{label}</div>
      </div>
    </div>
  );
}
