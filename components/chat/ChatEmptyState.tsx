'use client';

import { ShieldCheck, Landmark, Mic, Volume2 } from 'lucide-react';
import type { Language } from '@/store/app-store';
import { isDevanagari, t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Props = {
  language: Language;
  onPick: (q: string) => void;
};

/**
 * Example questions per language. Each row also has an English mirror so
 * that on a Devanagari UI we can show "हिन्दी question · English helper"
 * under each chip — letting Hindi-only and English-only readers share the
 * screen.
 */
type Example = { primary: string; en: string };

const PROMPTS: Partial<Record<Language, Example[]>> & { en: Example[] } = {
  hi: [
    { primary: 'FD पर कितना ब्याज मिलेगा?', en: 'How much interest will my FD earn?' },
    { primary: 'सीनियर सिटिज़न को कितना ज़्यादा मिलता है?', en: 'How much extra do seniors get?' },
    { primary: 'समय से पहले FD तोड़ने पर क्या होगा?', en: 'What if I break my FD early?' },
    { primary: 'TDS कब कटता है?', en: 'When is TDS deducted?' },
  ],
  bho: [
    { primary: 'FD पर कतना ब्याज मिली?', en: 'How much interest will my FD earn?' },
    { primary: 'सीनियर सिटिज़न के कतना बेसी मिलेला?', en: 'How much extra do seniors get?' },
    { primary: 'समय से पहिले FD तोड़े पर का होई?', en: 'What if I break my FD early?' },
    { primary: 'TDS कब कटेला?', en: 'When is TDS deducted?' },
  ],
  mai: [
    { primary: 'FD पर कतेक ब्याज भेटत?', en: 'How much interest will my FD earn?' },
    { primary: 'वरिष्ठ नागरिक केँ कतेक बेसी भेटैत अछि?', en: 'How much extra do seniors get?' },
    { primary: 'समय सं पहिने FD तोड़ब पर की हएत?', en: 'What if I break my FD early?' },
    { primary: 'TDS कखन कटैत अछि?', en: 'When is TDS deducted?' },
  ],
  en: [
    { primary: 'How much interest will my FD earn?', en: 'How much interest will my FD earn?' },
    { primary: 'How much extra do senior citizens get?', en: 'How much extra do senior citizens get?' },
    { primary: 'What happens if I break my FD early?', en: 'What happens if I break my FD early?' },
    { primary: 'When is TDS deducted from FD interest?', en: 'When is TDS deducted from FD interest?' },
  ],
};

export default function ChatEmptyState({ language, onPick }: Props) {
  const dev = isDevanagari(language);
  const prompts = PROMPTS[language] ?? PROMPTS.en;

  return (
    <div className="flex flex-col items-center px-4 py-6 text-center sm:py-10">
      {/* Friendly mark — ₹ inside a calm rounded shield, with a small lock dot */}
      <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-indigo-950/40 via-slate-900/30 to-slate-950/30 shadow-sm">
        <span className="text-4xl font-semibold text-amber-500">₹</span>
        <span className="absolute -bottom-1 -right-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-500/50 bg-slate-950 text-emerald-400 shadow">
          <ShieldCheck className="h-3.5 w-3.5" />
        </span>
      </div>

      <p className={cn('text-base text-slate-500 sm:text-lg', dev && 'devanagari')}>
        {t('empty.greeting', language)}
        {dev && <span className="ml-2 text-slate-600">· Hello</span>}
      </p>
      <h2
        className={cn(
          'mt-2 max-w-xl text-2xl font-semibold leading-snug tracking-tight text-slate-100 sm:text-3xl',
          dev && 'devanagari',
        )}
      >
        {t('empty.heroTitle', language)}
      </h2>
      {dev && (
        <p className="mt-1 max-w-xl text-sm text-slate-500">
          Ask in your language. We will explain.
        </p>
      )}
      <p
        className={cn(
          'mx-auto mt-3 max-w-md text-base leading-relaxed text-slate-400 sm:text-lg',
          dev && 'devanagari',
        )}
      >
        {t('empty.descPrefix', language)}
        <span className="text-slate-200">{t('empty.descEmphasis', language)}</span>
      </p>

      {/* Trust strip — small, calm, never technical (always bilingual) */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <TrustChip
          icon={<Landmark className="h-3.5 w-3.5 text-indigo-400" />}
          hi={t('empty.trust.rbi', 'hi')}
          en="Based on RBI documents"
          dev={dev}
        />
        <TrustChip
          icon={<ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />}
          hi={t('empty.trust.dicgc', 'hi')}
          en="Insured up to ₹5 lakh"
          dev={dev}
        />
        <TrustChip
          icon={<Volume2 className="h-3.5 w-3.5 text-amber-400" />}
          hi={t('empty.trust.bank', 'hi')}
          en="Straight from the bank document"
          dev={dev}
        />
      </div>

      <p
        className={cn(
          'mt-8 text-[11px] font-medium uppercase tracking-widest text-slate-500',
          dev && 'devanagari',
        )}
      >
        {t('chat.examples', language)}
        {dev && <span className="ml-2 text-slate-600">· Some examples</span>}
      </p>
      <div className="mt-3 flex max-w-xl flex-wrap justify-center gap-2">
        {prompts.map((q) => (
          <button
            key={q.primary}
            type="button"
            onClick={() => onPick(q.primary)}
            className={cn(
              'flex flex-col items-start rounded-2xl border border-slate-600/80 bg-slate-900/70 px-4 py-3 text-left leading-snug text-slate-100 transition hover:border-indigo-500/50 hover:bg-indigo-950/40 active:scale-[0.99] min-h-[60px] touch-manipulation',
            )}
          >
            <span className={cn('text-[15px]', dev && 'devanagari')}>{q.primary}</span>
            {dev && q.en && (
              <span className="mt-0.5 text-[12px] text-slate-500">{q.en}</span>
            )}
          </button>
        ))}
      </div>

      <p
        className={cn(
          'mt-6 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/20 px-3 py-1.5 text-xs text-amber-200',
          dev && 'devanagari',
        )}
      >
        <Mic className="h-3.5 w-3.5" />
        {t('chat.voiceCallout', language)}
        {dev && <span className="ml-1 text-amber-300/80">· Ask by voice</span>}
      </p>
    </div>
  );
}

function TrustChip({
  icon,
  hi,
  en,
  dev,
}: {
  icon: React.ReactNode;
  hi: string;
  en: string;
  dev: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/70 bg-slate-900/60 px-3 py-1 text-[12px] text-slate-300">
      {icon}
      {dev ? (
        <>
          <span className="devanagari">{hi}</span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-400">{en}</span>
        </>
      ) : (
        <span>{en}</span>
      )}
    </span>
  );
}
