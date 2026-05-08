'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language =
  | 'hi'
  | 'bho'
  | 'mai'
  | 'mr'
  | 'bn'
  | 'as'
  | 'or'
  | 'gu'
  | 'pa'
  | 'ur'
  | 'ta'
  | 'te'
  | 'kn'
  | 'ml'
  | 'en';

export const SUPPORTED_LANGUAGES: Language[] = [
  'hi',
  'bho',
  'mai',
  'mr',
  'bn',
  'as',
  'or',
  'gu',
  'pa',
  'ur',
  'ta',
  'te',
  'kn',
  'ml',
  'en',
];

export type ComparePolicy = {
  id: string;
  bankName: string;
  bankType: string;
  rateRegular: number;
  rateSenior: number;
  minDeposit: number;
  prematurePenalty: number;
  dicgcCovered: boolean;
  faissSessionId: string | null;
};

export type KbDocumentInfo = {
  faissSessionId: string;
  title: string;
  source: string;
  category: string;
  language: string;
};

/**
 * Pipeline tuned for citation-grounded FD/RBI RAG with BGE-M3 + hybrid
 * retrieval (BM25 + dense, RRF fused) + cross-encoder reranker. Top-K = 8
 * is the sweet spot: enough context to cite confidently, low enough to
 * keep a 7B Ollama model focused. Exposed as a constant — not a UI knob.
 */
export const RETRIEVAL_TOP_K = 8;

type AppState = {
  language: Language;
  selectedKbSessions: string[];
  comparePolicies: ComparePolicy[];
  knownKbDocuments: KbDocumentInfo[];

  setLanguage: (l: Language) => void;
  addKbSession: (id: string) => void;
  removeKbSession: (id: string) => void;
  setKbSessions: (ids: string[]) => void;

  addComparePolicy: (p: ComparePolicy) => void;
  removeComparePolicy: (id: string) => void;
  clearComparePolicies: () => void;

  setKnownKbDocuments: (docs: KbDocumentInfo[]) => void;
  /** Idempotent insert (or replace by `faissSessionId`). Used by the
   *  document-upload panel so newly indexed PDFs show up as "active source"
   *  chips without waiting for a `/api/discover` round-trip. */
  addKnownKbDocument: (doc: KbDocumentInfo) => void;
};

export const LANGUAGE_LABELS: Record<
  Language,
  { native: string; english: string; speakers: string; script: 'devanagari' | 'bengali' | 'gujarati' | 'gurmukhi' | 'arabic' | 'tamil' | 'telugu' | 'kannada' | 'malayalam' | 'odia' | 'latin' }
> = {
  hi: { native: 'हिन्दी', english: 'Hindi', speakers: '600M+', script: 'devanagari' },
  bho: { native: 'भोजपुरी', english: 'Bhojpuri', speakers: '52M+', script: 'devanagari' },
  mai: { native: 'मैथिली', english: 'Maithili', speakers: '34M+', script: 'devanagari' },
  mr: { native: 'मराठी', english: 'Marathi', speakers: '83M+', script: 'devanagari' },
  bn: { native: 'বাংলা', english: 'Bengali', speakers: '230M+', script: 'bengali' },
  as: { native: 'অসমীয়া', english: 'Assamese', speakers: '15M+', script: 'bengali' },
  or: { native: 'ଓଡ଼ିଆ', english: 'Odia', speakers: '38M+', script: 'odia' },
  gu: { native: 'ગુજરાતી', english: 'Gujarati', speakers: '56M+', script: 'gujarati' },
  pa: { native: 'ਪੰਜਾਬੀ', english: 'Punjabi', speakers: '33M+', script: 'gurmukhi' },
  ur: { native: 'اُردُو', english: 'Urdu', speakers: '70M+', script: 'arabic' },
  ta: { native: 'தமிழ்', english: 'Tamil', speakers: '75M+', script: 'tamil' },
  te: { native: 'తెలుగు', english: 'Telugu', speakers: '81M+', script: 'telugu' },
  kn: { native: 'ಕನ್ನಡ', english: 'Kannada', speakers: '44M+', script: 'kannada' },
  ml: { native: 'മലയാളം', english: 'Malayalam', speakers: '35M+', script: 'malayalam' },
  en: { native: 'English', english: 'English', speakers: 'Global', script: 'latin' },
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      language: 'hi',
      selectedKbSessions: ['kb_rbi_master', 'kb_dicgc'],
      comparePolicies: [],
      knownKbDocuments: [],

      setLanguage: (l) => set({ language: l }),
      addKbSession: (id) =>
        set((s) =>
          s.selectedKbSessions.includes(id)
            ? s
            : { selectedKbSessions: [...s.selectedKbSessions, id] },
        ),
      removeKbSession: (id) =>
        set((s) => ({ selectedKbSessions: s.selectedKbSessions.filter((x) => x !== id) })),
      setKbSessions: (ids) => set({ selectedKbSessions: ids }),

      addComparePolicy: (p) =>
        set((s) => {
          if (s.comparePolicies.length >= 4) return s;
          if (s.comparePolicies.find((x) => x.id === p.id)) return s;
          return { comparePolicies: [...s.comparePolicies, p] };
        }),
      removeComparePolicy: (id) =>
        set((s) => ({ comparePolicies: s.comparePolicies.filter((x) => x.id !== id) })),
      clearComparePolicies: () => set({ comparePolicies: [] }),

      // Merge with any existing user-uploaded entries (those keep `source: 'Upload'`)
      // so a fresh `/api/discover` load doesn't drop them.
      setKnownKbDocuments: (docs) =>
        set((s) => {
          const uploaded = s.knownKbDocuments.filter((d) => d.source === 'Upload');
          const next = [...docs];
          for (const u of uploaded) {
            if (!next.some((d) => d.faissSessionId === u.faissSessionId)) next.push(u);
          }
          return { knownKbDocuments: next };
        }),
      addKnownKbDocument: (doc) =>
        set((s) => {
          const filtered = s.knownKbDocuments.filter(
            (d) => d.faissSessionId !== doc.faissSessionId,
          );
          return { knownKbDocuments: [doc, ...filtered] };
        }),
    }),
    {
      name: 'vfd-advisor-store',
      partialize: (s) => ({
        language: s.language,
        selectedKbSessions: s.selectedKbSessions,
        comparePolicies: s.comparePolicies,
        // Persist user-uploaded docs only — server-discovered ones are
        // re-fetched on every load.
        knownKbDocuments: s.knownKbDocuments.filter((d) => d.source === 'Upload'),
      }),
    },
  ),
);
