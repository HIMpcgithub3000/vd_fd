'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  X,
  Plus,
  BookOpen,
  GitCompare,
  Shield,
  IndianRupee,
} from 'lucide-react';

import { useAppStore, type KbDocumentInfo, type Language } from '@/store/app-store';
import { cn } from '@/lib/utils';
import { isDevanagari, t } from '@/lib/i18n';
import LanguageToggle from './LanguageToggle';
import MaturityCalculator from '@/components/widgets/MaturityCalculator';
import DocumentUploadPanel from './DocumentUploadPanel';

function Accordion({
  title,
  altTitle,
  defaultOpen = true,
  language,
  children,
}: {
  title: string;
  /** Optional second-language title shown alongside `title` (used for the
   *  bilingual Hindi · English chrome on Devanagari UIs). */
  altTitle?: string;
  defaultOpen?: boolean;
  language: Language;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const dev = isDevanagari(language);
  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-950/30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400"
      >
        <span className="flex items-baseline gap-1.5">
          <span className={cn(dev && 'devanagari')}>{title}</span>
          {dev && altTitle && (
            <span className="text-[10px] font-medium normal-case tracking-normal text-slate-500">
              · {altTitle}
            </span>
          )}
        </span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="border-t border-slate-800/80 px-3 py-3">{children}</div>}
    </div>
  );
}

type Props = {
  className?: string;
  onCloseMobile?: () => void;
};

export default function AdvisorSidebar({ className, onCloseMobile }: Props) {
  const language = useAppStore((s) => s.language);
  const selectedKbSessions = useAppStore((s) => s.selectedKbSessions);
  const addKbSession = useAppStore((s) => s.addKbSession);
  const removeKbSession = useAppStore((s) => s.removeKbSession);
  const knownKbDocuments = useAppStore((s) => s.knownKbDocuments);
  const addKnownKbDocument = useAppStore((s) => s.addKnownKbDocument);

  const dev = isDevanagari(language);

  const selectedDocs = knownKbDocuments.filter((d) =>
    selectedKbSessions.includes(d.faissSessionId),
  );
  const availableDocs = knownKbDocuments.filter(
    (d) => !selectedKbSessions.includes(d.faissSessionId),
  );

  const navClose = () => onCloseMobile?.();

  return (
    <div
      className={cn(
        'flex h-full flex-col gap-3 overflow-y-auto border-r border-slate-800/90 bg-gradient-to-b from-vk-navy via-slate-950 to-slate-950 p-3 sm:p-4',
        dev && 'devanagari',
        className,
      )}
    >
      {/* Brand */}
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 px-3 py-3">
        <Link href="/" onClick={navClose} className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/20 text-lg font-semibold text-indigo-300">
              ₹
            </span>
            <span className="flex flex-col leading-tight">
              <span
                className={cn(
                  'text-sm font-bold tracking-tight text-slate-100',
                  dev && 'devanagari',
                )}
              >
                पैसा सहायक
              </span>
              {dev && (
                <span className="text-[10px] font-medium text-slate-500">Money Assistant</span>
              )}
            </span>
          </div>
          <p
            className={cn(
              'mt-1 text-[11px] leading-relaxed text-slate-400',
              dev && 'devanagari',
            )}
          >
            {t('brand.tagline', language)}
          </p>
        </Link>
      </div>

      {/* Vernacular */}
      <Accordion
        title={t('section.language', language)}
        altTitle="Language"
        language={language}
        defaultOpen
      >
        <p
          className={cn(
            'mb-2 text-[11px] text-slate-500',
            dev && 'devanagari',
          )}
        >
          {t('section.languageHint', language)}
        </p>
        <LanguageToggle />
      </Accordion>

      {/* Document upload */}
      <Accordion
        title={t('section.document', language)}
        altTitle="Add a document"
        language={language}
        defaultOpen
      >
        <DocumentUploadPanel
          language={language}
          onIndexed={({ sessionId, title }) => {
            addKnownKbDocument({
              faissSessionId: sessionId,
              title,
              source: 'Upload',
              category: 'user',
              language,
            });
            addKbSession(sessionId);
          }}
        />
      </Accordion>

      {/* Active knowledge */}
      <Accordion
        title={t('section.activeSources', language)}
        altTitle="Documents"
        language={language}
        defaultOpen
      >
        <div className="flex flex-wrap gap-1.5">
          {selectedDocs.length === 0 && (
            <p className={cn('text-[11px] text-slate-500', dev && 'devanagari')}>
              {t('sources.empty', language)}
            </p>
          )}
          {selectedDocs.map((d) => (
            <DocChip
              key={d.faissSessionId}
              doc={d}
              language={language}
              onRemove={() => removeKbSession(d.faissSessionId)}
            />
          ))}
        </div>
        {availableDocs.length > 0 && (
          <details className="mt-2">
            <summary
              className={cn(
                'cursor-pointer text-[11px] text-amber-500/90 hover:text-amber-400',
                dev && 'devanagari',
              )}
            >
              {t('sources.addMore', language)}
            </summary>
            <ul className="mt-2 max-h-36 space-y-0.5 overflow-y-auto rounded-md border border-slate-800 bg-slate-950/60 p-1">
              {availableDocs.map((d) => (
                <li key={d.faissSessionId}>
                  <button
                    type="button"
                    onClick={() => addKbSession(d.faissSessionId)}
                    className="flex w-full min-h-[40px] items-center justify-between rounded px-2 py-1.5 text-left text-[11px] text-slate-300 hover:bg-slate-800 touch-manipulation"
                  >
                    <span className="truncate pr-1">{d.title}</span>
                    <Plus className="h-3 w-3 shrink-0 text-slate-500" />
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Accordion>

      {/* Trust widgets */}
      <Accordion
        title={t('section.quickFacts', language)}
        altTitle="Good to know"
        language={language}
        defaultOpen={false}
      >
        <div
          className={cn(
            'space-y-2 text-[11px] leading-relaxed text-slate-400',
            dev && 'devanagari',
          )}
        >
          <div className="flex gap-2 rounded-lg border border-emerald-500/25 bg-emerald-950/20 p-2">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/90" />
            <p>
              <strong className="text-emerald-200/90">{t('facts.dicgcLabel', language)}</strong>
              {' — '}
              {t('facts.dicgcText', language)}
            </p>
          </div>
          <div className="flex gap-2 rounded-lg border border-amber-500/20 bg-amber-950/10 p-2">
            <IndianRupee className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/90" />
            <p>
              <strong className="text-amber-200/90">{t('facts.seniorLabel', language)}</strong>
              {' — '}
              {t('facts.seniorText', language)}
            </p>
          </div>
          <p className="rounded-md border border-slate-700/80 bg-slate-900/40 p-2 text-slate-500">
            <strong className="text-slate-400">{t('facts.prematureLabel', language)}</strong>
            {' — '}
            {t('facts.prematureText', language)}
          </p>
        </div>
      </Accordion>

      <MaturityCalculator />

      {/* Nav */}
      <div className="flex flex-col gap-1">
        <Link
          href="/compare"
          onClick={navClose}
          className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/40 px-3 py-2.5 text-sm text-slate-200 hover:border-indigo-500/40 hover:bg-indigo-950/30 touch-manipulation"
        >
          <GitCompare className="h-4 w-4 text-indigo-400" />
          <span className={cn(dev && 'devanagari')}>{t('nav.compare', language)}</span>
        </Link>
        <Link
          href="/discover"
          onClick={navClose}
          className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/40 px-3 py-2.5 text-sm text-slate-200 hover:border-indigo-500/40 hover:bg-indigo-950/30 touch-manipulation"
        >
          <BookOpen className="h-4 w-4 text-indigo-400" />
          <span className={cn(dev && 'devanagari')}>{t('nav.discover', language)}</span>
        </Link>
      </div>

      {/* Footer */}
      <div className="mt-auto space-y-2 border-t border-slate-800/80 pt-3">
        <p
          className={cn(
            'text-[11px] leading-relaxed text-slate-500',
            dev && 'devanagari',
          )}
        >
          {t('footer.disclaimer', language)}
        </p>
      </div>
    </div>
  );
}

function DocChip({
  doc,
  language,
  onRemove,
}: {
  doc: KbDocumentInfo;
  language: Language;
  onRemove: () => void;
}) {
  const isRbi = doc.source === 'RBI' || doc.faissSessionId.includes('rbi');
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 truncate rounded-full border px-2 py-1 text-[10px]',
        isRbi
          ? 'border-indigo-400/35 bg-indigo-500/15 text-indigo-100'
          : 'border-amber-500/25 bg-amber-500/10 text-amber-100/90',
      )}
    >
      <span className="truncate" title={doc.title}>
        {doc.title}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 hover:bg-white/10"
        aria-label={t('sources.remove', language)}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
