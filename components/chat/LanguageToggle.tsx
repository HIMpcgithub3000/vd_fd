'use client';

import { useAppStore, LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from '@/store/app-store';
import { cn } from '@/lib/utils';

/** Hindi-first language switcher with all 22-schedule-supported Indian languages. */
export default function LanguageToggle() {
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);

  return (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5">
      {SUPPORTED_LANGUAGES.map((lang) => {
        const active = language === lang;
        const meta = LANGUAGE_LABELS[lang];
        const isRtl = meta.script === 'arabic';
        return (
          <button
            key={lang}
            type="button"
            onClick={() => setLanguage(lang)}
            className={cn(
              'min-h-[44px] rounded-lg border px-2 py-2 text-center text-xs font-medium transition touch-manipulation',
              active
                ? 'border-amber-500/50 bg-amber-500/15 text-amber-100 shadow-sm'
                : 'border-slate-600/80 bg-slate-900/50 text-slate-400 hover:border-slate-500 hover:text-slate-200',
            )}
            title={`${meta.english} · ${meta.speakers} speakers`}
          >
            <span
              className={cn('block leading-tight', `script-${meta.script}`)}
              dir={isRtl ? 'rtl' : 'ltr'}
            >
              {meta.native}
            </span>
            <span className="mt-0.5 block text-[9px] font-normal uppercase tracking-wide opacity-70">
              {lang}
            </span>
          </button>
        );
      })}
    </div>
  );
}
