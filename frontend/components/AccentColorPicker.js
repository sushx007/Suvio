'use client';
import { useState } from 'react';
import { Check } from 'lucide-react';

const PRESETS = [
  '#38bdf8', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#64748b', '#a1a1aa',
];

export default function AccentColorPicker({ value, onChange }) {
  const [custom, setCustom] = useState(value || '#38bdf8');

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((c) => {
          const active = value?.toLowerCase() === c.toLowerCase();
          return (
            <button
              key={c}
              onClick={() => { setCustom(c); onChange?.(c); }}
              className={`relative w-9 h-9 rounded-lg transition-all hover:scale-110 ${active ? 'ring-2 ring-offset-2 ring-offset-background ring-white/70 scale-110' : ''}`}
              style={{ background: c, boxShadow: `0 0 20px -6px ${c}` }}
              title={c}
            >
              {active && <Check className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow" />}
            </button>
          );
        })}
      </div>
      <div className="mt-5 flex items-center gap-3">
        <label className="relative w-11 h-11 rounded-lg overflow-hidden cursor-pointer border border-[var(--suvio-border-strong)]" style={{ background: custom }}>
          <input
            type="color"
            value={custom}
            onChange={(e) => { setCustom(e.target.value); onChange?.(e.target.value); }}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </label>
        <div>
          <div className="text-sm font-medium">Custom color</div>
          <div className="text-xs text-[var(--suvio-text-muted)] font-mono">{custom.toUpperCase()}</div>
        </div>
        <input
          type="text"
          value={custom}
          onChange={(e) => {
            const v = e.target.value;
            setCustom(v);
            if (/^#([0-9a-f]{3}){1,2}$/i.test(v)) onChange?.(v);
          }}
          className="ml-auto bg-[var(--suvio-input-bg)] border border-[var(--suvio-border-strong)] rounded-lg px-3 py-2 text-sm font-mono w-32 outline-none focus:border-white/40"
        />
      </div>
    </div>
  );
}
