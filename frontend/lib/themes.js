// 8 premium theme presets. Each defines HSL tokens for the shadcn design system
// PLUS custom Suvio tokens for the glass/gradient/background engine.

export const THEMES = {
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    description: 'Signature deep-space dark. The Suvio default.',
    mode: 'dark',
    swatch: ['#09090b', '#18181b', '#0ea5e9'],
    tokens: {
      '--background': '240 10% 3.9%',
      '--foreground': '0 0% 98%',
      '--card': '240 6% 8%',
      '--card-foreground': '0 0% 98%',
      '--popover': '240 6% 8%',
      '--popover-foreground': '0 0% 98%',
      '--secondary': '240 4% 14%',
      '--secondary-foreground': '0 0% 98%',
      '--muted': '240 4% 14%',
      '--muted-foreground': '240 5% 65%',
      '--border': '240 4% 16%',
      '--input': '240 4% 16%',
      '--suvio-bg': '#09090B',
      '--suvio-surface': 'rgba(20, 20, 24, 0.55)',
      '--suvio-surface-strong': 'rgba(24, 24, 28, 0.75)',
      '--suvio-border': 'rgba(255,255,255,0.06)',
      '--suvio-border-strong': 'rgba(255,255,255,0.08)',
      '--suvio-text': '#ffffff',
      '--suvio-text-muted': 'rgba(255,255,255,0.55)',
      '--suvio-glow-1': 'rgba(56,189,248,0.18)',
      '--suvio-glow-2': 'rgba(168,85,247,0.12)',
      '--suvio-grid': 'rgba(255,255,255,0.04)',
      '--suvio-input-bg': 'rgba(0,0,0,0.4)',
    },
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: 'Cool blue depths with a tropical calm.',
    mode: 'dark',
    swatch: ['#031627', '#0a2b45', '#38bdf8'],
    tokens: {
      '--background': '210 60% 6%',
      '--foreground': '200 20% 96%',
      '--card': '210 45% 10%',
      '--card-foreground': '200 20% 96%',
      '--popover': '210 45% 10%',
      '--popover-foreground': '200 20% 96%',
      '--secondary': '210 40% 16%',
      '--secondary-foreground': '200 20% 96%',
      '--muted': '210 40% 16%',
      '--muted-foreground': '200 15% 70%',
      '--border': '210 40% 18%',
      '--input': '210 40% 18%',
      '--suvio-bg': '#031627',
      '--suvio-surface': 'rgba(10, 40, 65, 0.55)',
      '--suvio-surface-strong': 'rgba(12, 45, 72, 0.78)',
      '--suvio-border': 'rgba(125,211,252,0.10)',
      '--suvio-border-strong': 'rgba(125,211,252,0.16)',
      '--suvio-text': '#e0f2fe',
      '--suvio-text-muted': 'rgba(224,242,254,0.55)',
      '--suvio-glow-1': 'rgba(56,189,248,0.25)',
      '--suvio-glow-2': 'rgba(14,165,233,0.18)',
      '--suvio-grid': 'rgba(125,211,252,0.05)',
      '--suvio-input-bg': 'rgba(2,20,35,0.55)',
    },
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald',
    description: 'Forest-luxe greens for calm focus.',
    mode: 'dark',
    swatch: ['#04140d', '#0a2b1e', '#10b981'],
    tokens: {
      '--background': '160 60% 4%',
      '--foreground': '150 20% 96%',
      '--card': '160 45% 8%',
      '--card-foreground': '150 20% 96%',
      '--popover': '160 45% 8%',
      '--popover-foreground': '150 20% 96%',
      '--secondary': '160 40% 14%',
      '--secondary-foreground': '150 20% 96%',
      '--muted': '160 40% 14%',
      '--muted-foreground': '150 15% 68%',
      '--border': '160 40% 16%',
      '--input': '160 40% 16%',
      '--suvio-bg': '#04140d',
      '--suvio-surface': 'rgba(10, 40, 30, 0.55)',
      '--suvio-surface-strong': 'rgba(12, 45, 32, 0.78)',
      '--suvio-border': 'rgba(52,211,153,0.10)',
      '--suvio-border-strong': 'rgba(52,211,153,0.18)',
      '--suvio-text': '#ecfdf5',
      '--suvio-text-muted': 'rgba(236,253,245,0.55)',
      '--suvio-glow-1': 'rgba(16,185,129,0.24)',
      '--suvio-glow-2': 'rgba(52,211,153,0.14)',
      '--suvio-grid': 'rgba(110,231,183,0.05)',
      '--suvio-input-bg': 'rgba(4,20,13,0.55)',
    },
  },
  royal: {
    id: 'royal',
    name: 'Royal Purple',
    description: 'Regal purples for luxurious depth.',
    mode: 'dark',
    swatch: ['#100420', '#2a0e4a', '#a855f7'],
    tokens: {
      '--background': '270 60% 6%',
      '--foreground': '270 20% 97%',
      '--card': '270 45% 10%',
      '--card-foreground': '270 20% 97%',
      '--popover': '270 45% 10%',
      '--popover-foreground': '270 20% 97%',
      '--secondary': '270 40% 16%',
      '--secondary-foreground': '270 20% 97%',
      '--muted': '270 40% 16%',
      '--muted-foreground': '270 15% 70%',
      '--border': '270 40% 20%',
      '--input': '270 40% 20%',
      '--suvio-bg': '#100420',
      '--suvio-surface': 'rgba(42, 14, 74, 0.55)',
      '--suvio-surface-strong': 'rgba(48, 18, 82, 0.78)',
      '--suvio-border': 'rgba(196,181,253,0.10)',
      '--suvio-border-strong': 'rgba(196,181,253,0.18)',
      '--suvio-text': '#f5f3ff',
      '--suvio-text-muted': 'rgba(245,243,255,0.58)',
      '--suvio-glow-1': 'rgba(168,85,247,0.28)',
      '--suvio-glow-2': 'rgba(139,92,246,0.18)',
      '--suvio-grid': 'rgba(196,181,253,0.05)',
      '--suvio-input-bg': 'rgba(16,4,32,0.55)',
    },
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm amber-orange glow.',
    mode: 'dark',
    swatch: ['#1a0a05', '#3d1608', '#f97316'],
    tokens: {
      '--background': '18 60% 5%',
      '--foreground': '30 25% 97%',
      '--card': '18 45% 10%',
      '--card-foreground': '30 25% 97%',
      '--popover': '18 45% 10%',
      '--popover-foreground': '30 25% 97%',
      '--secondary': '18 40% 16%',
      '--secondary-foreground': '30 25% 97%',
      '--muted': '18 40% 16%',
      '--muted-foreground': '25 15% 70%',
      '--border': '18 40% 20%',
      '--input': '18 40% 20%',
      '--suvio-bg': '#1a0a05',
      '--suvio-surface': 'rgba(60, 22, 8, 0.55)',
      '--suvio-surface-strong': 'rgba(70, 26, 10, 0.78)',
      '--suvio-border': 'rgba(253,186,116,0.10)',
      '--suvio-border-strong': 'rgba(253,186,116,0.18)',
      '--suvio-text': '#fff7ed',
      '--suvio-text-muted': 'rgba(255,247,237,0.55)',
      '--suvio-glow-1': 'rgba(249,115,22,0.28)',
      '--suvio-glow-2': 'rgba(244,63,94,0.14)',
      '--suvio-grid': 'rgba(253,186,116,0.05)',
      '--suvio-input-bg': 'rgba(26,10,5,0.55)',
    },
  },
  rose: {
    id: 'rose',
    name: 'Rose',
    description: 'Soft rose blush over deep charcoal.',
    mode: 'dark',
    swatch: ['#1a0510', '#3d0a20', '#f43f5e'],
    tokens: {
      '--background': '345 60% 6%',
      '--foreground': '345 20% 97%',
      '--card': '345 45% 10%',
      '--card-foreground': '345 20% 97%',
      '--popover': '345 45% 10%',
      '--popover-foreground': '345 20% 97%',
      '--secondary': '345 40% 16%',
      '--secondary-foreground': '345 20% 97%',
      '--muted': '345 40% 16%',
      '--muted-foreground': '345 15% 70%',
      '--border': '345 40% 20%',
      '--input': '345 40% 20%',
      '--suvio-bg': '#1a0510',
      '--suvio-surface': 'rgba(60, 10, 32, 0.55)',
      '--suvio-surface-strong': 'rgba(70, 12, 38, 0.78)',
      '--suvio-border': 'rgba(253,164,175,0.10)',
      '--suvio-border-strong': 'rgba(253,164,175,0.18)',
      '--suvio-text': '#fff1f2',
      '--suvio-text-muted': 'rgba(255,241,242,0.55)',
      '--suvio-glow-1': 'rgba(244,63,94,0.28)',
      '--suvio-glow-2': 'rgba(236,72,153,0.16)',
      '--suvio-grid': 'rgba(253,164,175,0.05)',
      '--suvio-input-bg': 'rgba(26,5,16,0.55)',
    },
  },
  graphite: {
    id: 'graphite',
    name: 'Graphite',
    description: 'Pure neutral greys. Uncompromising focus.',
    mode: 'dark',
    swatch: ['#0a0a0a', '#1c1c1c', '#a1a1aa'],
    tokens: {
      '--background': '0 0% 4%',
      '--foreground': '0 0% 98%',
      '--card': '0 0% 8%',
      '--card-foreground': '0 0% 98%',
      '--popover': '0 0% 8%',
      '--popover-foreground': '0 0% 98%',
      '--secondary': '0 0% 14%',
      '--secondary-foreground': '0 0% 98%',
      '--muted': '0 0% 14%',
      '--muted-foreground': '0 0% 65%',
      '--border': '0 0% 18%',
      '--input': '0 0% 18%',
      '--suvio-bg': '#0a0a0a',
      '--suvio-surface': 'rgba(28, 28, 28, 0.55)',
      '--suvio-surface-strong': 'rgba(32, 32, 32, 0.78)',
      '--suvio-border': 'rgba(255,255,255,0.06)',
      '--suvio-border-strong': 'rgba(255,255,255,0.10)',
      '--suvio-text': '#fafafa',
      '--suvio-text-muted': 'rgba(250,250,250,0.55)',
      '--suvio-glow-1': 'rgba(255,255,255,0.06)',
      '--suvio-glow-2': 'rgba(255,255,255,0.03)',
      '--suvio-grid': 'rgba(255,255,255,0.04)',
      '--suvio-input-bg': 'rgba(0,0,0,0.4)',
    },
  },
  snow: {
    id: 'snow',
    name: 'Snow',
    description: 'Airy light theme for daytime work.',
    mode: 'light',
    swatch: ['#fafafa', '#e4e4e7', '#0ea5e9'],
    tokens: {
      '--background': '0 0% 100%',
      '--foreground': '240 10% 3.9%',
      '--card': '0 0% 100%',
      '--card-foreground': '240 10% 3.9%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '240 10% 3.9%',
      '--secondary': '240 4.8% 95.9%',
      '--secondary-foreground': '240 5.9% 10%',
      '--muted': '240 4.8% 95.9%',
      '--muted-foreground': '240 3.8% 46.1%',
      '--border': '240 5.9% 90%',
      '--input': '240 5.9% 90%',
      '--suvio-bg': '#fafafa',
      '--suvio-surface': 'rgba(255, 255, 255, 0.72)',
      '--suvio-surface-strong': 'rgba(255, 255, 255, 0.92)',
      '--suvio-border': 'rgba(0,0,0,0.06)',
      '--suvio-border-strong': 'rgba(0,0,0,0.08)',
      '--suvio-text': '#0a0a0b',
      '--suvio-text-muted': 'rgba(10,10,11,0.55)',
      '--suvio-glow-1': 'rgba(56,189,248,0.14)',
      '--suvio-glow-2': 'rgba(168,85,247,0.08)',
      '--suvio-grid': 'rgba(0,0,0,0.04)',
      '--suvio-input-bg': 'rgba(255,255,255,0.85)',
    },
  },
};

export const DEFAULT_THEME = 'midnight';
export const DEFAULT_ACCENT = '#38bdf8'; // sky-400

// Convert HEX -> HSL (space separated for CSS var use with hsl())
export function hexToHsl(hex) {
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  let r = ((bigint >> 16) & 255) / 255;
  let g = ((bigint >> 8) & 255) / 255;
  let b = (bigint & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hh = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hh = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hh = (b - r) / d + 2; break;
      case b: hh = (r - g) / d + 4; break;
    }
    hh /= 6;
  }
  return `${Math.round(hh * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const b = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return { r: (b >> 16) & 255, g: (b >> 8) & 255, b: b & 255 };
}

export function applyTheme(themeId, accentHex) {
  if (typeof document === 'undefined') return;
  const theme = THEMES[themeId] || THEMES[DEFAULT_THEME];
  const root = document.documentElement;
  // Set mode class for tailwind dark: variants
  if (theme.mode === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
  root.setAttribute('data-theme', theme.id);
  // Apply theme tokens
  for (const [k, v] of Object.entries(theme.tokens)) {
    root.style.setProperty(k, v);
  }
  // Apply accent color as HSL + raw values
  const accent = accentHex || DEFAULT_ACCENT;
  const hsl = hexToHsl(accent);
  const { r, g, b } = hexToRgb(accent);
  root.style.setProperty('--primary', hsl);
  root.style.setProperty('--primary-foreground', theme.mode === 'light' ? '0 0% 100%' : '0 0% 100%');
  root.style.setProperty('--ring', hsl);
  root.style.setProperty('--accent-hex', accent);
  root.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
  root.style.setProperty('--accent-hsl', hsl);
  // Chart accents (5-step tint of accent)
  root.style.setProperty('--chart-1', hsl);
  root.style.setProperty('--chart-2', shiftHslLightness(hsl, +8));
  root.style.setProperty('--chart-3', shiftHslLightness(hsl, -8));
  root.style.setProperty('--chart-4', shiftHslHue(hsl, +30));
  root.style.setProperty('--chart-5', shiftHslHue(hsl, -30));
}

function shiftHslLightness(hsl, delta) {
  const [h, s, l] = hsl.split(' ');
  const lNum = Math.max(0, Math.min(100, parseInt(l) + delta));
  return `${h} ${s} ${lNum}%`;
}

function shiftHslHue(hsl, delta) {
  const [h, s, l] = hsl.split(' ');
  const hNum = (parseInt(h) + delta + 360) % 360;
  return `${hNum} ${s} ${l}`;
}
