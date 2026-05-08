'use client';

import { X, FileText, Hash, Highlighter, ShieldCheck } from 'lucide-react';
import type { MessageSource } from '@/lib/schema';
import type { Language } from '@/store/app-store';
import { useAppStore } from '@/store/app-store';
import { isDevanagari, t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  AUTHORITY_COLOR_CLASSES,
  getAuthorityInfo,
} from '@/lib/source-authority';

type Props = {
  open: boolean;
  source: MessageSource | null;
  onClose: () => void;
  /** Last user query — used to softly highlight overlapping terms in the chunk (explainability). */
  highlightQuery?: string;
};

function highlightChunk(text: string, query: string | undefined): React.ReactNode {
  if (!query || query.trim().length < 2) {
    return text;
  }
  const tokens = query
    .toLowerCase()
    .split(/[\s,?.!]+/)
    .filter((tok) => tok.length > 2)
    .slice(0, 8);
  if (tokens.length === 0) return text;

  const pattern = new RegExp(
    `(${tokens.map((tok) => tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi',
  );
  const parts = text.split(pattern);
  return parts.map((part, i) => {
    const hit = tokens.some((tok) => part.toLowerCase() === tok.toLowerCase());
    if (hit) {
      return (
        <mark key={i} className="rounded bg-amber-500/25 px-0.5 text-amber-100">
          {part}
        </mark>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function SourceDrawer({ open, source, onClose, highlightQuery }: Props) {
  const language = useAppStore((s) => s.language) as Language;
  const dev = isDevanagari(language);

  if (!open || !source) return null;

  const authority = getAuthorityInfo(source.faissSessionId, source.doc, language);
  const authColors = AUTHORITY_COLOR_CLASSES[authority.color];

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={cn(
          'fixed right-0 top-0 z-40 flex h-full w-full max-w-md flex-col border-l border-indigo-500/20 bg-gradient-to-b from-slate-950 to-vk-navy shadow-2xl animate-slideIn',
          dev && 'devanagari',
        )}
        role="dialog"
        aria-label={`${t('drawer.title', language)} ${source.index}`}
      >
        <header className="flex flex-col gap-2 border-b border-slate-800/90 bg-slate-950/80 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'rounded-lg border p-2',
                  authColors.chip,
                )}
              >
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-100">
                  {t('drawer.title', language)} {source.index}
                </h3>
                <p className="text-[10px] text-slate-500">{t('drawer.subtitle', language)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 touch-manipulation"
              aria-label={t('drawer.close', language)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div
            className={cn(
              'inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
              authColors.chip,
            )}
            title={authority.trustLabel}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', authColors.dot)} />
            {authority.label} · {authority.trustLabel}
          </div>
        </header>

        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                {t('drawer.fieldDoc', language)}
              </dt>
              <dd className="mt-1 font-medium text-slate-100">{source.doc}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                {t('drawer.fieldPage', language)}
              </dt>
              <dd className="mt-1 inline-flex items-center gap-1 text-base font-semibold text-indigo-200">
                <Hash className="h-4 w-4 text-indigo-400/80" />
                {source.page}
              </dd>
            </div>
          </dl>

          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <Highlighter className="h-3 w-3 text-amber-500/80" />
              {t('drawer.chunkHeading', language)}
            </h4>
            <pre className="max-h-[55vh] overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-700/80 bg-slate-900/60 p-4 text-sm leading-relaxed text-slate-200">
              {highlightChunk(source.chunkText, highlightQuery)}
            </pre>
          </div>
        </div>
      </aside>
    </>
  );
}
