import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const noto = Noto_Sans_Devanagari({
  subsets: ['devanagari', 'latin'],
  variable: '--font-noto-devanagari',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Vernacular FD Advisor',
  description:
    'Multilingual RAG-powered financial knowledge for Indian retail investors. Cited answers about FDs, RBI, DICGC, KYC in Hindi, Bhojpuri, Maithili, and English.',
  applicationName: 'Vernacular FD Advisor',
};

export const viewport: Viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
};

/** Inline script run before React hydrates so the right theme is applied
 *  before first paint. Reads `vfd-advisor-theme` from localStorage; defaults
 *  to light mode if no preference is stored. */
const themeBootstrap = `(function(){try{var t=localStorage.getItem('vfd-advisor-theme');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="hi"
      className={`${inter.variable} ${noto.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
