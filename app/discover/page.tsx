'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppStore, type ComparePolicy } from '@/store/app-store';
import { Search, Filter, ShieldCheck, ArrowRight, Plus, MessageSquareQuote } from 'lucide-react';
import LanguageToggle from '@/components/chat/LanguageToggle';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { isDevanagari, t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Policy = ComparePolicy & {
  rateRegular: number;
  rateSenior: number;
  prematurePenalty: number;
};

export default function DiscoverPage() {
  const language = useAppStore((s) => s.language);
  const dev = isDevanagari(language);

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [bankType, setBankType] = useState<'all' | 'Scheduled Commercial' | 'Small Finance Bank'>(
    'all',
  );
  const [minRate, setMinRate] = useState(0);
  const [insight, setInsight] = useState('');

  const addComparePolicy = useAppStore((s) => s.addComparePolicy);
  const addKbSession = useAppStore((s) => s.addKbSession);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/discover')
      .then((r) => r.json())
      .then((d) => setPolicies(d.policies || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/insights')
      .then((r) => r.json())
      .then((d) => setInsight(typeof d.key_insight === 'string' ? d.key_insight : ''))
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return policies.filter((p) => {
      if (search && !p.bankName.toLowerCase().includes(search.toLowerCase())) return false;
      if (bankType !== 'all' && p.bankType !== bankType) return false;
      if (p.rateRegular < minRate) return false;
      return true;
    });
  }, [policies, search, bankType, minRate]);

  return (
    <main className={cn('min-h-screen bg-slate-950 text-slate-100', dev && 'devanagari')}>
      <header className="border-b border-slate-800 bg-slate-900/50 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{t('discover.title', language)}</h1>
            <p className="text-xs text-slate-500">{t('discover.subtitle', language)}</p>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <Link
              href="/chat"
              className="rounded-md border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
            >
              {t('discover.openChat', language)}
            </Link>
            <Link
              href="/compare"
              className="rounded-md bg-indigo-500 px-3 py-1.5 text-sm font-semibold hover:bg-indigo-400"
            >
              {t('discover.openCompare', language)}
            </Link>
          </div>
        </div>
      </header>

      <section className="border-b border-slate-800 bg-slate-900/30 px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
          <label className="flex flex-1 items-center gap-2 rounded-md border border-slate-700 bg-slate-950 px-3 py-2">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('discover.searchPlaceholder', language)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-600"
            />
          </label>
          <label className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={bankType}
              onChange={(e) => setBankType(e.target.value as typeof bankType)}
              className="bg-transparent outline-none"
            >
              <option value="all">{t('discover.bankTypeAll', language)}</option>
              <option value="Scheduled Commercial">
                {t('discover.bankTypeSCB', language)}
              </option>
              <option value="Small Finance Bank">
                {t('discover.bankTypeSFB', language)}
              </option>
            </select>
          </label>
          <label className="flex items-center gap-3 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
            <span className="text-slate-500">{t('discover.minRate', language)}</span>
            <input
              type="range"
              min={0}
              max={10}
              step={0.25}
              value={minRate}
              onChange={(e) => setMinRate(Number(e.target.value))}
              className="accent-indigo-500"
            />
            <span className="w-12 text-right text-indigo-300">{minRate.toFixed(2)}%</span>
          </label>
        </div>
      </section>

      <section className="mx-auto max-w-6xl p-6">
        {insight && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-indigo-700 bg-indigo-950/80 p-4">
            <span className="mt-0.5 text-lg text-indigo-400">📊</span>
            <p className={cn('text-sm leading-relaxed text-indigo-100/95', dev && 'devanagari')}>
              <strong className="text-indigo-300">{t('discover.insightLabel', language)}: </strong>
              {insight}
            </p>
          </div>
        )}
        {loading ? (
          <p className="text-slate-500">{t('discover.loading', language)}</p>
        ) : filtered.length === 0 ? (
          <p className="text-slate-500">{t('discover.noMatches', language)}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <article
                key={p.id}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 transition hover:border-indigo-400/40"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{p.bankName}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">{p.bankType}</p>
                  </div>
                  {p.dicgcCovered && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                      <ShieldCheck className="h-3 w-3" /> DICGC
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-end gap-2">
                  <span className="text-3xl font-bold text-emerald-400">
                    {p.rateRegular.toFixed(2)}%
                  </span>
                  <span className="text-xs text-slate-500">
                    {t('discover.seniorPrefix', language)} {p.rateSenior.toFixed(2)}%
                  </span>
                </div>

                <dl className="mt-4 space-y-1 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <dt>{t('discover.minDeposit', language)}</dt>
                    <dd className="text-slate-200">₹{p.minDeposit.toLocaleString('en-IN')}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>{t('discover.prematurePenalty', language)}</dt>
                    <dd className="text-slate-200">{p.prematurePenalty.toFixed(2)}%</dd>
                  </div>
                </dl>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => addComparePolicy(p)}
                    className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-indigo-400/60 hover:bg-indigo-500/10"
                  >
                    <Plus className="mr-1 inline h-3 w-3" />
                    {t('discover.addToCompare', language)}
                  </button>
                  <button
                    onClick={() => {
                      if (p.faissSessionId) addKbSession(p.faissSessionId);
                      router.push('/chat');
                    }}
                    className="flex-1 rounded-md bg-indigo-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-400"
                  >
                    <MessageSquareQuote className="mr-1 inline h-3 w-3" />
                    {t('discover.openQa', language)}
                    <ArrowRight className="ml-1 inline h-3 w-3" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
