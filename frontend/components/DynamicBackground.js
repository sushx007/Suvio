'use client';
import { usePreferences } from '@/components/PreferencesProvider';

// A subtle, theme+accent aware background layer.
// Uses CSS vars set by applyTheme() and the current accent to paint smooth glows.
export default function DynamicBackground() {
  const { accentColor } = usePreferences();
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -top-1/3 left-1/2 -translate-x-1/2 w-[120vw] h-[80vh] blur-3xl opacity-70 transition-all duration-700"
        style={{
          background: `radial-gradient(ellipse at center, ${accentColor}33 0%, transparent 60%)`,
        }}
      />
      <div
        className="absolute -bottom-1/4 right-0 w-[80vw] h-[60vh] blur-3xl opacity-50 transition-all duration-700"
        style={{
          background: `radial-gradient(ellipse at center, var(--suvio-glow-2) 0%, transparent 55%)`,
        }}
      />
      <div
        className="absolute -bottom-1/3 left-0 w-[70vw] h-[55vh] blur-3xl opacity-40 transition-all duration-700"
        style={{
          background: `radial-gradient(ellipse at center, ${accentColor}22 0%, transparent 55%)`,
        }}
      />
    </div>
  );
}
