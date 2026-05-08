'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Calculator } from 'lucide-react';
import { calcMaturitySummary, formatINR } from '@/lib/finance-math';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import { isDevanagari, t } from '@/lib/i18n';

export default function MaturityCalculator() {
  const language = useAppStore((s) => s.language);
  const dev = isDevanagari(language);

  const [open, setOpen] = useState(true);
  const [principal, setPrincipal] = useState(100000);
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(1);
  const [senior, setSenior] = useState(false);

  const summary = useMemo(
    () => calcMaturitySummary(principal, rate, years, senior),
    [principal, rate, years, senior],
  );

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/60">
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/40"
      >
        <span className={cn('flex items-center gap-2', dev && 'devanagari')}>
          <Calculator className="h-4 w-4 text-indigo-300" />
          {t('calc.title', language)}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 text-slate-500 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-800 p-3">
          <Field
            label={t('calc.principal', language)}
            dev={dev}
            value={principal}
            onChange={setPrincipal}
            step={1000}
            min={1000}
          />
          <Field
            label={t('calc.rate', language)}
            dev={dev}
            value={rate}
            onChange={setRate}
            step={0.05}
            min={0}
            max={15}
          />
          <Field
            label={t('calc.years', language)}
            dev={dev}
            value={years}
            onChange={setYears}
            step={0.25}
            min={0.25}
          />

          <label
            className={cn(
              'flex items-center gap-2 text-xs text-slate-300',
              dev && 'devanagari',
            )}
          >
            <input
              type="checkbox"
              checked={senior}
              onChange={(e) => setSenior(e.target.checked)}
              className="accent-indigo-500"
            />
            {t('calc.senior', language)}
          </label>

          <div className="rounded-md border border-emerald-400/20 bg-emerald-500/5 p-3 text-xs">
            <Row k={t('calc.maturityAmount', language)} v={formatINR(summary.maturityAmount)} dev={dev} highlight />
            <Row k={t('calc.interest', language)} v={formatINR(summary.interestEarned)} dev={dev} />
            <Row k={t('calc.tds', language)} v={formatINR(summary.tdsDeducted)} dev={dev} />
            <Row k={t('calc.net', language)} v={formatINR(summary.netReceivable)} dev={dev} highlight />
          </div>
          <p
            className={cn(
              'text-[10px] leading-snug text-slate-500',
              dev && 'devanagari',
            )}
          >
            {t('calc.note', language)}
          </p>
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  dev,
  value,
  onChange,
  step,
  min,
  max,
}: {
  label: string;
  dev: boolean;
  value: number;
  onChange: (v: number) => void;
  step: number;
  min: number;
  max?: number;
}) {
  return (
    <label className="block text-xs text-slate-400">
      <span className={cn(dev && 'devanagari')}>{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-indigo-400/60"
      />
    </label>
  );
}

function Row({
  k,
  v,
  dev,
  highlight = false,
}: {
  k: string;
  v: string;
  dev: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between py-0.5">
      <span className={cn('text-slate-400', dev && 'devanagari')}>{k}</span>
      <span className={cn(highlight ? 'font-semibold text-emerald-300' : 'text-slate-200')}>{v}</span>
    </div>
  );
}
