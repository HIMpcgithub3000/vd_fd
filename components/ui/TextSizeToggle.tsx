'use client';

import { useEffect, useState } from 'react';
import { Type } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Senior-citizen typography toggle. Cycles base font size between
 * **default → large → x-large** by adding `.text-size-lg` / `.text-size-xl`
 * to the document root. Persisted in localStorage.
 *
 * Required for the Ramesh-Kumar persona — older users on Android often
 * struggle with the default 14-15px base size.
 */
type Size = 'default' | 'large' | 'xlarge';

const STORAGE_KEY = 'vfd-advisor-text-size';

function applySize(s: Size) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('text-size-lg', 'text-size-xl');
  if (s === 'large') root.classList.add('text-size-lg');
  else if (s === 'xlarge') root.classList.add('text-size-xl');
}

function readInitial(): Size {
  if (typeof window === 'undefined') return 'default';
  const stored = window.localStorage?.getItem(STORAGE_KEY);
  if (stored === 'default' || stored === 'large' || stored === 'xlarge') return stored;
  return 'default';
}

const ORDER: Size[] = ['default', 'large', 'xlarge'];
const LABELS: Record<Size, string> = {
  default: 'A',
  large: 'A+',
  xlarge: 'A++',
};

type Props = {
  className?: string;
};

export default function TextSizeToggle({ className }: Props) {
  const [size, setSize] = useState<Size>('default');

  useEffect(() => {
    const s = readInitial();
    setSize(s);
    applySize(s);
  }, []);

  const cycle = () => {
    const idx = ORDER.indexOf(size);
    const next = ORDER[(idx + 1) % ORDER.length];
    setSize(next);
    applySize(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* best-effort */
    }
  };

  const tooltip =
    size === 'default'
      ? 'Increase text size (large)'
      : size === 'large'
        ? 'Increase text size (extra large)'
        : 'Reset text size';

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={tooltip}
      title={tooltip}
      className={cn(
        'inline-flex h-9 min-w-[44px] items-center justify-center gap-1 rounded-md border border-slate-700/60 bg-slate-900/40 px-2 text-slate-300 transition hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-indigo-300',
        className,
      )}
    >
      <Type className="h-3.5 w-3.5" />
      <span className="text-xs font-semibold">{LABELS[size]}</span>
    </button>
  );
}
