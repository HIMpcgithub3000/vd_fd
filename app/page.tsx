'use client';

import Link from 'next/link';
import { Mic, ShieldCheck, Landmark, FileText, Volume2, ArrowRight } from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import HiEnToggle from '@/components/ui/HiEnToggle';
import { useAppStore } from '@/store/app-store';

/**
 * Landing page — calm, light, banking-inspired.
 * Designed for non-technical, Hindi-first users (50+, parents, senior citizens).
 *
 * Bilingual on purpose: every primary action carries a Hindi label *and* a
 * small English helper line directly underneath, so a user who reads only
 * Devanagari and a user who reads only Latin both understand the same screen.
 * The Hi/En toggle in the top-right flips the whole app's language for users
 * who want everything in English.
 *
 * Deliberately avoids: dark "AI lab" gradients, jargon (RAG, embeddings, Top-K,
 * FAISS, retrieval, model names), dashboard chrome, technical badges. The goal
 * is for a first-time visitor to feel calm and in control within 2 seconds.
 */
export default function LandingPage() {
  const language = useAppStore((s) => s.language);
  const isEn = language === 'en';

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_440px_at_50%_-10%,_rgba(99,102,241,0.10),_transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_360px_at_100%_10%,_rgba(245,158,11,0.06),_transparent_60%)]" />

      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-900/40 text-2xl font-semibold text-indigo-400 ring-1 ring-indigo-700/40">
            ₹
          </span>
          <div className="leading-tight">
            <p className="devanagari text-base font-semibold text-slate-100">पैसा सहायक</p>
            <p className="text-[11px] text-slate-500">
              <span className="devanagari">आपकी भाषा में</span> · in your language
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <HiEnToggle className="hidden sm:inline-flex" />
          <ThemeToggle />
        </div>
      </header>

      {/* Mobile: show the Hi/En toggle in its own row so the header doesn't crowd */}
      <div className="relative z-10 mx-auto -mt-1 flex max-w-5xl justify-end px-5 sm:hidden">
        <HiEnToggle />
      </div>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-3xl px-5 pt-8 pb-6 text-center sm:px-8 sm:pt-14">
        <p className="devanagari text-base text-slate-500 sm:text-lg">नमस्ते 🙏 · Hello</p>

        {isEn ? (
          <>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.15] tracking-tight text-slate-100 sm:text-6xl">
              Ask in your language,
              <br className="hidden sm:block" />
              <span className="text-indigo-400">we’ll explain simply</span>
            </h1>
            <p className="devanagari mx-auto mt-3 max-w-xl text-base text-slate-500">
              अपनी भाषा में पूछिए, हम सरल जवाब देंगे
            </p>
          </>
        ) : (
          <>
            <h1 className="devanagari mt-3 text-4xl font-semibold leading-[1.15] tracking-tight text-slate-100 sm:text-6xl">
              अपनी भाषा में पूछिए,
              <br className="hidden sm:block" />
              <span className="text-indigo-400">हम सरल जवाब देंगे</span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-base text-slate-500">
              Ask in your language, we’ll explain simply.
            </p>
          </>
        )}

        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-slate-400 sm:text-xl">
          {isEn ? (
            <>
              Get FD and banking information in your own language —
              <br className="hidden sm:block" />
              easy to read, easy to understand.
            </>
          ) : (
            <>
              Get FD and banking information in your own language —
              <br className="hidden sm:block" />
              easy to read, easy to understand.
            </>
          )}
        </p>

        {/* Primary actions — Hindi label + English helper line */}
        <div className="mx-auto mt-9 flex max-w-md flex-col items-stretch gap-3 sm:flex-row sm:items-stretch sm:justify-center">
          <Link
            href="/chat"
            className="inline-flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-2xl bg-indigo-500 px-7 font-semibold text-white shadow-md shadow-indigo-500/20 transition hover:bg-indigo-400 active:scale-[0.99]"
          >
            <span className="inline-flex items-center gap-2 text-lg">
              <span className="devanagari">बात शुरू करें</span>
              <ArrowRight className="h-5 w-5" />
            </span>
            <span className="text-[12px] font-normal opacity-85">Start the chat</span>
          </Link>
          <Link
            href="/chat?voice=1"
            className="inline-flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-2xl border border-amber-500/50 bg-amber-900/30 px-6 font-semibold text-amber-200 transition hover:bg-amber-900/50"
          >
            <span className="inline-flex items-center gap-2 text-base">
              <Mic className="h-5 w-5" />
              <span className="devanagari">बोलकर पूछें</span>
            </span>
            <span className="text-[12px] font-normal opacity-85">Ask by voice</span>
          </Link>
        </div>

        <p className="mt-4 text-sm text-slate-500">
          <span className="devanagari">हिन्दी · भोजपुरी · मैथिली</span> · English ·
          <span className="devanagari"> +11 अन्य भाषाएँ</span> / 11 more
        </p>
      </section>

      {/* Example questions — bilingual chips */}
      <section className="relative z-10 mx-auto max-w-3xl px-5 pb-4 sm:px-8">
        <p className="mb-3 text-center text-sm font-medium text-slate-500">
          <span className="devanagari">आप ये सवाल पूछ सकते हैं</span>
          <span className="mx-1.5 text-slate-600">·</span>
          You can ask things like
        </p>
        <div className="mx-auto flex max-w-2xl flex-wrap justify-center gap-2.5">
          {EXAMPLES.map((q) => (
            <Link
              key={q.hi}
              href={`/chat?q=${encodeURIComponent(isEn ? q.en : q.hi)}`}
              className="inline-flex min-h-[60px] max-w-full flex-col items-start rounded-2xl border border-slate-700/80 bg-slate-900/60 px-4 py-2.5 leading-snug text-slate-200 shadow-sm transition hover:border-indigo-500/50 hover:bg-indigo-950/40"
            >
              <span className="devanagari inline-flex items-center gap-2 text-[15px]">
                {q.icon}
                {q.hi}
              </span>
              <span className="ml-6 text-[12px] text-slate-500">{q.en}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust strip — RBI / DICGC / Voice */}
      <section className="relative z-10 mx-auto mt-10 grid max-w-3xl gap-3 px-5 pb-12 sm:grid-cols-3 sm:px-8">
        <TrustCard
          icon={<Landmark className="h-5 w-5 text-indigo-400" />}
          titleHi="RBI के दस्तावेज़ों से"
          titleEn="From official RBI documents"
          bodyHi="हर जवाब RBI और बैंकों के असली दस्तावेज़ों पर आधारित होता है।"
          bodyEn="Every answer is based on real RBI and bank documents."
        />
        <TrustCard
          icon={<ShieldCheck className="h-5 w-5 text-emerald-400" />}
          titleHi="₹5 लाख तक सुरक्षित"
          titleEn="Insured up to ₹5 lakh"
          bodyHi="हर बैंक में आपकी जमा (मूलधन + ब्याज) RBI की DICGC योजना से सुरक्षित है।"
          bodyEn="Your deposit (principal + interest) is insured up to ₹5 lakh per bank by the RBI’s DICGC."
        />
        <TrustCard
          icon={<Volume2 className="h-5 w-5 text-amber-400" />}
          titleHi="बोलकर भी पूछ सकते हैं"
          titleEn="You can also speak"
          bodyHi="लिखना मुश्किल लगे तो माइक दबाकर अपनी भाषा में बोलिए।"
          bodyEn="If typing feels hard, press the mic and speak in your language."
        />
      </section>

      <footer className="relative z-10 border-t border-slate-800 bg-slate-950/60 px-5 py-5 text-center backdrop-blur sm:px-8">
        <p className="devanagari text-sm text-slate-500">
          यह जानकारी समझाने के लिए है — वित्तीय सलाह नहीं। बड़े फैसले से पहले अपने बैंक से पुष्टि कर लीजिए।
        </p>
        <p className="mt-1 text-[12px] text-slate-600">
          For your understanding only — not financial advice. Please confirm with your bank before any big decision.
        </p>
      </footer>
    </main>
  );
}

const EXAMPLES = [
  {
    hi: 'FD पर कितना ब्याज मिलेगा?',
    en: 'How much interest will my FD earn?',
    icon: <Landmark className="h-4 w-4 text-indigo-400" />,
  },
  {
    hi: 'सीनियर सिटिज़न को कितना ज़्यादा मिलता है?',
    en: 'How much extra do senior citizens get?',
    icon: <ShieldCheck className="h-4 w-4 text-emerald-400" />,
  },
  {
    hi: 'समय से पहले FD तोड़ने पर क्या होगा?',
    en: 'What if I break my FD early?',
    icon: <FileText className="h-4 w-4 text-amber-400" />,
  },
  {
    hi: 'TDS कब कटता है?',
    en: 'When is TDS deducted?',
    icon: <FileText className="h-4 w-4 text-amber-400" />,
  },
];

function TrustCard(props: {
  icon: React.ReactNode;
  titleHi: string;
  titleEn: string;
  bodyHi: string;
  bodyEn: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950/60 ring-1 ring-slate-800">
          {props.icon}
        </span>
        <div className="leading-tight">
          <p className="devanagari text-[15px] font-semibold text-slate-100">{props.titleHi}</p>
          <p className="text-[12px] text-slate-500">{props.titleEn}</p>
        </div>
      </div>
      <p className="devanagari mt-3 text-sm leading-relaxed text-slate-300">{props.bodyHi}</p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-slate-500">{props.bodyEn}</p>
    </div>
  );
}
