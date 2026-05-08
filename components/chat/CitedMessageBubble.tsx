'use client';

import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Volume2, VolumeX, FileText } from 'lucide-react';
import type { ToolInvocation } from 'ai';
import { cn } from '@/lib/utils';
import type { MessageSource } from '@/lib/schema';
import type { RetrievalMeta } from '@/lib/rag-client';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import VoicePicker from './VoicePicker';
import CitationBadge from './CitationBadge';
import type { Language } from '@/store/app-store';
import { isDevanagari, t } from '@/lib/i18n';
import {
  AUTHORITY_COLOR_CLASSES,
  classifyAuthority,
  getAuthorityInfo,
} from '@/lib/source-authority';
import { findEvidenceMatches, splitWithEvidence } from '@/lib/evidence-highlight';

type ResponseKind = 'normal' | 'gated' | 'out_of_scope' | null;

type Props = {
  role: 'user' | 'assistant';
  content: string;
  sources?: MessageSource[];
  /** Internal grounding tier — kept for backwards compatibility. No longer
   *  rendered to the user (we don't surface "high confidence" badges). */
  confidence?: 'low' | 'medium' | 'high';
  language: Language;
  onCitationClick?: (source: MessageSource) => void;
  isStreaming?: boolean;
  toolInvocations?: ToolInvocation[];
  responseKind?: ResponseKind;
  /** Retrieval telemetry — kept on the prop for parent compat, intentionally
   *  not rendered in the user-facing bubble (felt too "AI lab"). */
  retrievalMeta?: RetrievalMeta | null;
};

export default function CitedMessageBubble({
  role,
  content,
  sources = [],
  language,
  onCitationClick,
  isStreaming = false,
  toolInvocations,
  responseKind = 'normal',
}: Props) {
  const [showAllSources, setShowAllSources] = useState(false);
  const tts = useTextToSpeech();
  const dev = isDevanagari(language);

  const parsedSegments = useMemo(() => splitWithCitations(content), [content]);

  // Compute "evidence-highlighted" version of each plain-text segment so we
  // can underline phrases that exist verbatim in a cited chunk.
  const evidenceMap = useMemo(() => {
    if (role !== 'assistant' || isStreaming || sources.length === 0) {
      return null;
    }
    const map = new Map<number, ReturnType<typeof splitWithEvidence>>();
    parsedSegments.forEach((seg, i) => {
      if (seg.kind !== 'text' || seg.value.length < 30) return;
      const matches = findEvidenceMatches(seg.value, sources);
      if (matches.length === 0) return;
      map.set(i, splitWithEvidence(seg.value, matches));
    });
    return map;
  }, [parsedSegments, sources, role, isStreaming]);

  // Sort sources by authority weight descending, then by score, for the
  // "View sources" expansion list. Doesn't change which sources are passed
  // through to the LLM; only changes display order.
  const sortedSources = useMemo(() => {
    if (sources.length === 0) return sources;
    return [...sources].sort((a, b) => {
      const aWeight = authorityWeight(a);
      const bWeight = authorityWeight(b);
      if (bWeight !== aWeight) return bWeight - aWeight;
      return (b.score ?? 0) - (a.score ?? 0);
    });
  }, [sources]);

  const maturityResult = useMemo(() => {
    const inv = toolInvocations?.find(
      (x) => x.toolName === 'calculate_maturity' && x.state === 'result',
    );
    if (!inv || inv.state !== 'result') return null;
    return inv.result as {
      formula_shown?: string;
      computation_note?: string;
    };
  }, [toolInvocations]);

  const showRetrievalWarning =
    role === 'assistant' && !isStreaming && responseKind === 'gated';

  const isUser = role === 'user';
  const sourceLabel = t('citation.tag', language);

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'group max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed',
          isUser
            ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
            : 'border border-slate-800 bg-slate-900/60 text-slate-100',
        )}
      >
        <div
          className={cn(
            'md-body prose prose-invert max-w-none text-base sm:text-[17px]',
            isStreaming && 'streaming-caret',
            dev && 'devanagari',
          )}
        >
          {isUser ? (
            <p className="m-0 whitespace-pre-wrap">{content}</p>
          ) : (
            <RenderWithCitations
              segments={parsedSegments}
              evidenceMap={evidenceMap}
              sources={sources}
              sourceLabel={sourceLabel}
              language={language}
              onClick={(s) => onCitationClick?.(s)}
            />
          )}
        </div>

        {maturityResult?.formula_shown && !isUser && (
          <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900 p-3">
            <p className="mb-1 text-xs font-medium text-slate-400">
              📐 {t('bubble.deterministicLabel', language)}
            </p>
            <p className="break-all font-mono text-sm text-emerald-400">{maturityResult.formula_shown}</p>
            {maturityResult.computation_note && (
              <p className="mt-1 text-xs text-slate-500">{maturityResult.computation_note}</p>
            )}
          </div>
        )}

        {showRetrievalWarning && (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-700 bg-amber-950/80 p-3">
            <span className="text-amber-400">⚠️</span>
            <div>
              <p className="text-xs font-semibold text-amber-200">{t('bubble.unreliableTitle', language)}</p>
              <p className={cn('mt-0.5 text-sm text-amber-100/95', dev && 'devanagari')}>
                {t('bubble.unreliableBody', language)}
              </p>
            </div>
          </div>
        )}

        {!isUser && !isStreaming && (
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-800/60 pt-3">
            {sources.length > 0 && (
              <button
                onClick={() => setShowAllSources((s) => !s)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-[12px] font-medium text-slate-200 hover:border-indigo-400/50 hover:bg-indigo-500/10',
                  dev && 'devanagari',
                )}
              >
                <FileText className="h-3.5 w-3.5" />
                {t('bubble.viewSources', language)} ({sources.length})
              </button>
            )}
            {tts.isSupported && (
              <>
                <button
                  onClick={() => (tts.isSpeaking ? tts.stop() : tts.speak(content, language))}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-[12px] font-medium text-slate-200 hover:border-indigo-400/50 hover:bg-indigo-500/10',
                    dev && 'devanagari',
                  )}
                  aria-label={
                    tts.isSpeaking ? t('bubble.stop', language) : t('bubble.listen', language)
                  }
                >
                  {tts.isSpeaking ? (
                    <VolumeX className="h-3.5 w-3.5" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5" />
                  )}
                  {tts.isSpeaking
                    ? t('bubble.stop', language)
                    : t('bubble.listen', language)}
                </button>
                <VoicePicker language={language} />
              </>
            )}
          </div>
        )}

        {!isUser && showAllSources && sortedSources.length > 0 && (
          <ul className="mt-3 space-y-2">
            {sortedSources.map((s) => {
              const authority = getAuthorityInfo(s.faissSessionId, s.doc, language);
              const colors = AUTHORITY_COLOR_CLASSES[authority.color];
              return (
                <li key={s.index}>
                  <button
                    onClick={() => onCitationClick?.(s)}
                    className={cn(
                      'flex w-full flex-col gap-1 rounded-lg border border-slate-700 bg-slate-950 p-3 text-left text-[13px] hover:border-indigo-400/50 hover:bg-indigo-500/10',
                      dev && 'devanagari',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                          colors.chip,
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', colors.dot)} />
                        {authority.label}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {t('bubble.page', language)} {s.page}
                      </span>
                    </div>
                    <span className="font-medium text-slate-200">{s.doc}</span>
                    <span className="text-[11px] text-slate-500">
                      {authority.trustLabel}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function authorityWeight(s: MessageSource): number {
  const tier = classifyAuthority(s.faissSessionId, s.doc);
  // Mirror lib/source-authority.ts TIER_TABLE weights without re-importing.
  switch (tier) {
    case 'rbi':
      return 100;
    case 'dicgc':
      return 95;
    case 'tax':
      return 85;
    case 'sebi':
      return 80;
    case 'rate_card':
      return 70;
    case 'bank':
      return 60;
    case 'upload':
      return 30;
    default:
      return 0;
  }
}

type Segment =
  | { kind: 'text'; value: string }
  | { kind: 'citation'; index: number; raw: string };

function splitWithCitations(content: string): Segment[] {
  const re = /\[(?:स्रोत|Source)\s*(\d+)\]/gi;
  const segments: Segment[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    if (match.index > last) {
      segments.push({ kind: 'text', value: content.slice(last, match.index) });
    }
    segments.push({ kind: 'citation', index: Number(match[1]), raw: match[0] });
    last = match.index + match[0].length;
  }
  if (last < content.length) segments.push({ kind: 'text', value: content.slice(last) });
  return segments;
}

function RenderWithCitations({
  segments,
  evidenceMap,
  sources,
  sourceLabel,
  language,
  onClick,
}: {
  segments: Segment[];
  evidenceMap: Map<number, ReturnType<typeof splitWithEvidence>> | null;
  sources: MessageSource[];
  sourceLabel: string;
  language: Language;
  onClick: (s: MessageSource) => void;
}) {
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.kind === 'text') {
          const evidenceSegments = evidenceMap?.get(i);
          if (evidenceSegments && evidenceSegments.length > 0) {
            return (
              <span key={i}>
                {evidenceSegments.map((es, j) =>
                  es.kind === 'evidence' ? (
                    <span
                      key={j}
                      className="evidence-mark"
                      title={t('evidence.fromSource', language)}
                    >
                      {es.text}
                    </span>
                  ) : (
                    <ReactMarkdown
                      key={j}
                      remarkPlugins={[remarkGfm]}
                      components={{ p: ({ children }) => <span>{children}</span> }}
                    >
                      {es.text}
                    </ReactMarkdown>
                  ),
                )}
              </span>
            );
          }
          return (
            <ReactMarkdown
              key={i}
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <span>{children}</span>,
              }}
            >
              {seg.value}
            </ReactMarkdown>
          );
        }
        const src = sources.find((s) => s.index === seg.index);
        return (
          <CitationBadge
            key={i}
            source={src}
            index={seg.index}
            sourceLabel={sourceLabel}
            language={language}
            onClick={() => src && onClick(src)}
          />
        );
      })}
    </>
  );
}
