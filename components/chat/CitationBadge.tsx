'use client';

import { useState, useRef, useEffect } from 'react';
import type { MessageSource } from '@/lib/schema';
import type { Language } from '@/store/app-store';
import { isDevanagari, t } from '@/lib/i18n';
import {
  AUTHORITY_COLOR_CLASSES,
  classifyAuthority,
  getAuthorityInfo,
} from '@/lib/source-authority';
import { cn } from '@/lib/utils';

type Props = {
  source: MessageSource | undefined;
  index: number;
  sourceLabel: string;
  language: Language;
  onClick: () => void;
};

/**
 * Renders an inline `[Source N]` chip with:
 *   • a left-edge color dot showing the source's *authority tier*
 *     (RBI / DICGC / Tax / Bank / Upload / Rate-card)
 *   • a hover/long-press popover that previews the first ~140 chars of
 *     the underlying chunk before the user commits to opening the full drawer
 *
 * Click → opens the full Source Drawer (existing behaviour).
 */
export default function CitationBadge({
  source,
  index,
  sourceLabel,
  language,
  onClick,
}: Props) {
  const [open, setOpen] = useState(false);
  const dev = isDevanagari(language);
  const containerRef = useRef<HTMLSpanElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const authority = source
    ? getAuthorityInfo(source.faissSessionId, source.doc, language)
    : null;
  const colors = authority
    ? AUTHORITY_COLOR_CLASSES[authority.color]
    : AUTHORITY_COLOR_CLASSES.slate;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const scheduleClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setOpen(false), 120);
  };
  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const preview = source?.chunkText
    ? source.chunkText.slice(0, 180).trim() + (source.chunkText.length > 180 ? '…' : '')
    : '';

  return (
    <span ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => source && onClick()}
        onMouseEnter={() => {
          cancelClose();
          if (source) setOpen(true);
        }}
        onMouseLeave={scheduleClose}
        onFocus={() => source && setOpen(true)}
        onBlur={scheduleClose}
        className={cn('citation-badge', dev && 'devanagari')}
        aria-label={
          source
            ? `${authority?.label ?? sourceLabel} ${index} — ${source.doc}`
            : `${sourceLabel} ${index}`
        }
      >
        <span
          className={cn('mr-1 inline-block h-1.5 w-1.5 rounded-full', colors.dot)}
          aria-hidden="true"
        />
        {sourceLabel} {index}
      </button>

      {open && source && authority && (
        <span
          role="tooltip"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          className={cn(
            'absolute left-0 top-full z-30 mt-1 w-72 max-w-[80vw] rounded-lg border border-slate-700 bg-slate-950/95 p-3 text-[11px] leading-snug text-slate-200 shadow-2xl backdrop-blur',
            dev && 'devanagari',
          )}
        >
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                colors.chip,
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', colors.dot)} />
              {authority.label}
            </span>
            <span className="text-[10px] text-slate-500">
              {t('bubble.page', language)} {source.page}
            </span>
          </div>
          <p className="mb-1 truncate font-medium text-slate-100">{source.doc}</p>
          <p className="line-clamp-3 whitespace-pre-wrap text-slate-300">{preview}</p>
          <p className="mt-2 text-[9px] text-indigo-300">
            {t('preview.viewFull', language)} →
          </p>
        </span>
      )}
    </span>
  );
}
