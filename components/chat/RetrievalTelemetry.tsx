'use client';

import type { RetrievalMeta } from '@/lib/rag-client';
import type { Language } from '@/store/app-store';

type Props = {
  meta: RetrievalMeta | null | undefined;
  language: Language;
};

/**
 * Retrieval telemetry strip — historically rendered "X chunks searched · Y%
 * top score · BM25+dense+rerank · N indices" under each assistant bubble.
 *
 * Removed from the user-facing UI (felt too "AI lab" for non-technical
 * Indian users — RBI wording, percent scores, model pipeline names).
 *
 * Kept as a typed no-op so any older call sites still type-check.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function RetrievalTelemetry(_props: Props) {
  return null;
}
