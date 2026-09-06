import './globals.css';
import { Toaster } from 'sonner';
import { PreferencesProvider } from '@/components/PreferencesProvider';
import DynamicBackground from '@/components/DynamicBackground';
import Splash from '@/components/Splash';
import PWA from '@/components/PWA';

export const metadata = {
  title: 'Suvio — Your AI Personal Operating System',
  description: 'Suvio replaces 10 apps with one intelligent OS for your life. Tasks, finance, health, wardrobe, travel — powered by AI.',
  manifest: '/manifest.webmanifest',
  themeColor: '#09090B',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Suvio' },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192' }, { url: '/icons/icon-512.png', sizes: '512x512' }],
  },
};

export const viewport = {
  themeColor: '#09090B',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

// Inline script prevents theme FOUC on first paint by applying cached theme
// tokens BEFORE React hydrates.
const themeBootstrap = `
(function(){
  try {
    var raw = localStorage.getItem('suvio.preferences');
    var p = raw ? JSON.parse(raw) : { theme: 'midnight', accentColor: '#38bdf8' };
    var themes = {
      midnight: { mode:'dark', bg:'#09090B' },
      ocean:    { mode:'dark', bg:'#031627' },
      emerald:  { mode:'dark', bg:'#04140d' },
      royal:    { mode:'dark', bg:'#100420' },
      sunset:   { mode:'dark', bg:'#1a0a05' },
      rose:     { mode:'dark', bg:'#1a0510' },
      graphite: { mode:'dark', bg:'#0a0a0a' },
      snow:     { mode:'light', bg:'#fafafa' },
    };
    var t = themes[p.theme] || themes.midnight;
    var root = document.documentElement;
    if (t.mode === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
    root.setAttribute('data-theme', p.theme || 'midnight');
    root.style.setProperty('--suvio-bg', t.bg);
    root.style.setProperty('--accent-hex', p.accentColor || '#38bdf8');
    document.body && (document.body.style.background = t.bg);
  } catch(e){}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-screen antialiased">
        <PreferencesProvider>
          <DynamicBackground />
          <Splash />
          {children}
          <Toaster position="top-right" richColors />
          <PWA />
        </PreferencesProvider>
      </body>
    </html>
  );
}
