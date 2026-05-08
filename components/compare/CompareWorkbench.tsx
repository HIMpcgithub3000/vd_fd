'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Plus, Sparkles, ShieldCheck, Volume2, VolumeX, ArrowLeft } from 'lucide-react';

import { useAppStore, type ComparePolicy, type Language } from '@/store/app-store';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import LanguageToggle from '@/components/chat/LanguageToggle';
import ThemeToggle from '@/components/ui/ThemeToggle';
import type { MessageSource } from '@/lib/schema';
import { isDevanagari, t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const PRESET_QUESTIONS_BY_LANG: Partial<Record<Language, string[]>> & { en: string[] } = {
  hi: [
    'प्रीमेच्योर पेनल्टी',
    'सीनियर सिटिज़न रेट',
    'न्यूनतम जमा',
    'TDS नियम',
    'ऑटो-रिन्यूअल',
    'DICGC कवर',
    'टैक्स सेवर विकल्प',
  ],
  bho: [
    'प्रीमेच्योर पेनल्टी',
    'सीनियर रेट',
    'मिनिमम डिपॉज़िट',
    'TDS',
    'ऑटो रिन्यूअल',
    'DICGC',
    'टैक्स सेवर',
  ],
  mai: [
    'प्रीमेच्योर पेनल्टी',
    'वरिष्ठ नागरिक दर',
    'न्यूनतम जमा',
    'TDS',
    'स्वतः नवीकरण',
    'DICGC',
    'कर बचत',
  ],
  en: [
    'Premature penalty',
    'Senior citizen rate',
    'Minimum deposit',
    'TDS rules',
    'Auto-renewal',
    'DICGC coverage',
    'Tax saver option',
  ],
};

type CompareResponse = {
  perPolicyAnswers: Array<{
    policyName: string;
    answer: string;
    sources: MessageSource[];
    bankName: string;
  }>;
  comparisonSummary: string;
};

export default function CompareWorkbench() {
  const language = useAppStore((s) => s.language);
  const comparePolicies = useAppStore((s) => s.comparePolicies);
  const addComparePolicy = useAppStore((s) => s.addComparePolicy);
  const removeComparePolicy = useAppStore((s) => s.removeComparePolicy);
  const clearComparePolicies = useAppStore((s) => s.clearComparePolicies);

  const dev = isDevanagari(language);

  const [allPolicies, setAllPolicies] = useState<ComparePolicy[]>([]);
  const [query, setQuery] = useState(t('compare.defaultQuery', language));
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tts = useTextToSpeech();

  // Refresh the default query when language changes — but only if the user
  // hasn't typed something custom (we treat "still equal to any of the
  // localized defaults" as untouched).
  useEffect(() => {
    const allDefaults = (['hi', 'bho', 'mai', 'en'] as const).map((l) =>
      t('compare.defaultQuery', l),
    );
    setQuery((cur) => (allDefaults.includes(cur) ? t('compare.defaultQuery', language) : cur));
  }, [language]);

  // Load policies + pre-populate Suryoday + Ujjivan for the demo.
  useEffect(() => {
    fetch('/api/discover')
      .then((r) => r.json())
      .then((d) => {
        const policies: ComparePolicy[] = d.policies || [];
        setAllPolicies(policies);
        if (comparePolicies.length === 0) {
          const suryoday = policies.find((p) => p.bankName.toLowerCase().includes('suryoday'));
          const ujjivan = policies.find((p) => p.bankName.toLowerCase().includes('ujjivan'));
          if (suryoday) addComparePolicy(suryoday);
          if (ujjivan) addComparePolicy(ujjivan);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const presetQuestions = PRESET_QUESTIONS_BY_LANG[language] ?? PRESET_QUESTIONS_BY_LANG.en;
  const presetIsDevanagari = language !== 'en';

  const compare = async (q?: string) => {
    const askQuery = q ?? query;
    if (!askQuery.trim()) return;
    if (comparePolicies.length < 2) {
      setError(t('compare.errMinTwo', language));
      return;
    }
    setError(null);
    setLoading(true);
    setResults(null);
    setQuery(askQuery);
    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: askQuery,
          policies: comparePolicies.map((p) => ({
            id: p.id,
            bankName: p.bankName,
            faissSessionId: p.faissSessionId,
          })),
          language,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: CompareResponse = await res.json();
      setResults(data);
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : 'Compare failed';
      setError(m);
    } finally {
      setLoading(false);
    }
  };

  const availablePolicies = allPolicies.filter(
    (p) => !comparePolicies.find((cp) => cp.id === p.id),
  );

  return (
    <main
      className={cn('min-h-screen bg-slate-950 text-slate-100', dev && 'devanagari')}
    >
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/chat"
            className="rounded-md p-1.5 hover:bg-slate-800"
            aria-label={t('compare.back', language)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-base font-semibold">{t('compare.title', language)}</h1>
            <p className="text-xs text-slate-500">{t('compare.subtitle', language)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-6">
        {/* Policy slots */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">
              {t('compare.banksHeading', language)}
            </h2>
            {comparePolicies.length > 0 && (
              <button
                onClick={clearComparePolicies}
                className="text-xs text-slate-500 hover:text-rose-300"
              >
                {t('compare.clearAll', language)}
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((slot) => {
              const p = comparePolicies[slot];
              if (p)
                return (
                  <SlotCard
                    key={p.id}
                    p={p}
                    language={language}
                    onRemove={() => removeComparePolicy(p.id)}
                  />
                );
              return (
                <AddSlot
                  key={slot}
                  available={availablePolicies}
                  language={language}
                  onPick={(picked) => addComparePolicy(picked)}
                />
              );
            })}
          </div>
        </div>

        {/* Query bar */}
        <div className="mb-3 flex flex-wrap gap-2">
          {presetQuestions.map((q) => (
            <button
              key={q}
              onClick={() => compare(q)}
              className={cn(
                'rounded-full border border-slate-700 bg-slate-900/40 px-3 py-1.5 text-xs text-slate-300 hover:border-indigo-400/60 hover:bg-indigo-500/10',
                presetIsDevanagari && 'devanagari',
              )}
            >
              {q}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && compare()}
            className={cn(
              'flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-400/60',
              dev && 'devanagari',
            )}
            placeholder={t('compare.placeholder', language)}
          />
          <button
            onClick={() => compare()}
            disabled={loading || comparePolicies.length < 2}
            className="rounded-md bg-indigo-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? t('compare.asking', language) : t('compare.askAll', language)}
          </button>
        </div>

        {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}

        {/* Results grid */}
        {results && (
          <>
            <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              {results.perPolicyAnswers.map((a) => (
                <article
                  key={a.policyName}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 p-4"
                >
                  <header className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold">{a.bankName}</h3>
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                      DICGC
                    </span>
                  </header>
                  <p
                    className={cn(
                      'whitespace-pre-wrap text-sm leading-relaxed text-slate-200',
                      dev && 'devanagari',
                    )}
                  >
                    {a.answer}
                  </p>
                  {a.sources.length > 0 && (
                    <ul className="mt-3 space-y-1 border-t border-slate-800 pt-2 text-[11px] text-slate-500">
                      {a.sources.map((s) => (
                        <li key={s.index} className={cn(dev && 'devanagari')}>
                          [{t('citation.tag', language)} {s.index}] {s.doc} ·{' '}
                          {t('bubble.page', language)} {s.page}
                          {' · '}
                          {Math.round(s.score * 100)}%
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-slate-900/40 p-5">
              <header className="mb-2 flex items-center justify-between">
                <h3
                  className={cn(
                    'flex items-center gap-2 font-semibold text-indigo-200',
                    dev && 'devanagari',
                  )}
                >
                  <Sparkles className="h-4 w-4 text-indigo-300" />
                  {t('compare.aiSummary', language)}
                </h3>
                {tts.isSupported && (
                  <button
                    onClick={() =>
                      tts.isSpeaking
                        ? tts.stop()
                        : tts.speak(results.comparisonSummary, language)
                    }
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800',
                      dev && 'devanagari',
                    )}
                  >
                    {tts.isSpeaking ? (
                      <VolumeX className="h-3 w-3" />
                    ) : (
                      <Volume2 className="h-3 w-3" />
                    )}
                    {tts.isSpeaking
                      ? t('bubble.stop', language)
                      : `🔊 ${t('bubble.listen', language)}`}
                  </button>
                )}
              </header>
              <p
                className={cn(
                  'whitespace-pre-wrap text-sm leading-relaxed text-slate-100',
                  dev && 'devanagari',
                )}
              >
                {results.comparisonSummary}
              </p>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function SlotCard({
  p,
  language,
  onRemove,
}: {
  p: ComparePolicy;
  language: Language;
  onRemove: () => void;
}) {
  return (
    <article className="relative rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <button
        onClick={onRemove}
        className="absolute right-2 top-2 rounded-full p-1 text-slate-500 hover:bg-slate-800 hover:text-rose-300"
        aria-label={t('compare.removePolicy', language)}
      >
        <X className="h-3 w-3" />
      </button>
      <h3 className="text-sm font-semibold text-slate-100">{p.bankName}</h3>
      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500">{p.bankType}</p>

      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-emerald-400">{p.rateRegular.toFixed(2)}%</span>
        <span className="text-[10px] text-slate-500">
          / {t('discover.seniorPrefix', language)} {p.rateSenior.toFixed(2)}%
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {p.dicgcCovered && (
          <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
            <ShieldCheck className="h-2.5 w-2.5" /> DICGC
          </span>
        )}
        {p.bankType === 'Small Finance Bank' && (
          <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
            SFB
          </span>
        )}
      </div>
    </article>
  );
}

function AddSlot({
  available,
  language,
  onPick,
}: {
  available: ComparePolicy[];
  language: Language;
  onPick: (p: ComparePolicy) => void;
}) {
  const [open, setOpen] = useState(false);
  const dev = isDevanagari(language);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((s) => !s)}
        className={cn(
          'flex h-full min-h-[140px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/20 p-4 text-slate-500 transition hover:border-indigo-400/40 hover:bg-indigo-500/5 hover:text-indigo-300',
        )}
      >
        <Plus className="h-6 w-6" />
        <span className={cn('mt-1 text-xs', dev && 'devanagari')}>
          {t('compare.addBank', language)}
        </span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-md border border-slate-700 bg-slate-950 p-1 shadow-xl">
          {available.length === 0 && (
            <p className={cn('px-3 py-2 text-xs text-slate-500', dev && 'devanagari')}>
              {t('compare.noMoreBanks', language)}
            </p>
          )}
          {available.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onPick(p);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm text-slate-200 hover:bg-slate-800"
            >
              <span>{p.bankName}</span>
              <span className="text-xs text-emerald-400">{p.rateRegular.toFixed(2)}%</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
