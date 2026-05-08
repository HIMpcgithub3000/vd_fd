'use client';

import { Languages } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';

/**
 * Compact two-button language toggle: हिन्दी ↔ English.
 *
 * Sits in the landing page header and the chat header so that a user who
 * does not read Devanagari can flip the entire UI to English in one tap,
 * without opening the sidebar. The full 14-language picker still lives in
 * the chat sidebar for other Indian-language users.
 *
 * The toggle is intentionally bilingual itself (हिन्दी label uses Devanagari
 * font, "English" uses Latin) so both audiences recognise it instantly.
 */
export default function HiEnToggle({ className }: { className?: string }) {
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);

  // For non-hi/non-en languages, treat the "Hi" side as the user's current
  // Devanagari/regional language (don't force-switch their bho/mai away just
  // by clicking the left half). Default behaviour: clicking left ⇒ hi.
  const isEn = language === 'en';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-slate-700 bg-slate-900/70 p-0.5 text-[12px] shadow-sm',
        className,
      )}
      role="group"
      aria-label="Language · भाषा"
    >
      <Languages className="ml-1.5 mr-0.5 h-3.5 w-3.5 text-slate-500" />
      <button
        type="button"
        onClick={() => setLanguage('hi')}
        className={cn(
          'devanagari rounded-full px-3 py-1 font-medium transition',
          !isEn
            ? 'bg-amber-500/20 text-amber-100 ring-1 ring-amber-500/40'
            : 'text-slate-400 hover:text-slate-200',
        )}
        aria-pressed={!isEn}
      >
        हिन्दी
      </button>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={cn(
          'rounded-full px-3 py-1 font-medium transition',
          isEn
            ? 'bg-amber-500/20 text-amber-100 ring-1 ring-amber-500/40'
            : 'text-slate-400 hover:text-slate-200',
        )}
        aria-pressed={isEn}
      >
        English
      </button>
    </div>
  );
}
