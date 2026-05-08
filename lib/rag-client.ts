import type { Language } from './prompts';

const BASE = (process.env.RAG_BACKEND_URL ?? 'http://localhost:8000').replace(/\/$/, '');
const KEY = process.env.RAG_API_KEY ?? 'vfd-advisor-internal-2024';

export type RagSource = {
  index: number;
  doc: string;
  page: number;
  score: number;
  faissSessionId: string;
  chunkText: string;
  /** Cross-encoder rerank score in [0,1] (sigmoid-normalized). */
  rerankScore?: number | null;
  /** Raw dense (FAISS / BGE-M3) cosine score before rerank. */
  denseScore?: number | null;
  /** Reciprocal-rank-fusion score before rerank. */
  rrfScore?: number | null;
};

export type RetrievalMeta = {
  chunks_searched: number;
  chunks_returned?: number;
  top_score: number;
  retrieval_path: 'hybrid+rerank' | 'hybrid+rrf';
  sessions_queried: string[];
  cross_encoder_active: boolean;
  reason?: string;
};

export type RetrieveResponse = {
  context_blocks: string;
  sources: RagSource[];
  meta?: RetrievalMeta;
};

export type ChatResponse = {
  answer: string;
  sources: RagSource[];
};

export type ComparePolicyResult = {
  policyName: string;
  bankName: string;
  answer: string;
  sources: RagSource[];
};

export type CompareResponse = {
  perPolicyAnswers: ComparePolicyResult[];
  comparisonSummary: string;
};

/**
 * Snapshot of a single bank's seeded `fd_policies` row, sent to the RAG
 * backend so it can synthesise a rate-card source block for the bank
 * even when no brochure has been indexed under its FAISS session.
 */
export type PolicyFact = {
  bank_name: string;
  bank_type: string;
  rate_regular: number | string;
  rate_senior: number | string;
  min_deposit: number;
  premature_penalty: number | string;
  dicgc_covered: boolean;
  rbi_licensed: boolean;
  tax_saver_available: boolean;
  notes?: string | null;
};

const REQUEST_TIMEOUT_MS = Number(process.env.RAG_REQUEST_TIMEOUT_MS ?? 25_000);

async function request<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': KEY,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`RAG backend ${path} failed: ${res.status} ${text}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error(
        `RAG backend ${path} timed out after ${REQUEST_TIMEOUT_MS}ms — backend slow or unreachable`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Tiny in-memory TTL cache for retrieve(). The same query during a demo
// frequently re-runs (different topK, same intent) — cache flat-keys hits
// for 60s. No memory pressure: capped at 64 entries (LRU eviction).
// ---------------------------------------------------------------------------
const RETRIEVE_CACHE_TTL_MS = 60_000;
const RETRIEVE_CACHE_MAX = 64;
type CacheEntry = { at: number; value: RetrieveResponse };
const retrieveCache = new Map<string, CacheEntry>();

function retrieveCacheKey(args: {
  query: string;
  sessionIds: string[];
  language: Language;
  topK?: number;
}): string {
  const sorted = [...args.sessionIds].sort().join('|');
  return `${args.language}::${args.topK ?? 5}::${sorted}::${args.query.trim().toLowerCase()}`;
}

export const rag = {
  async retrieve(args: {
    query: string;
    sessionIds: string[];
    language: Language;
    topK?: number;
  }): Promise<RetrieveResponse> {
    const key = retrieveCacheKey(args);
    const cached = retrieveCache.get(key);
    const now = Date.now();
    if (cached && now - cached.at < RETRIEVE_CACHE_TTL_MS) {
      // Refresh LRU position by re-inserting.
      retrieveCache.delete(key);
      retrieveCache.set(key, cached);
      return cached.value;
    }
    const value = await request<RetrieveResponse>('/api/retrieve', {
      query: args.query,
      session_ids: args.sessionIds,
      language: args.language,
      top_k: args.topK ?? 5,
    });
    retrieveCache.set(key, { at: now, value });
    if (retrieveCache.size > RETRIEVE_CACHE_MAX) {
      const oldestKey = retrieveCache.keys().next().value;
      if (oldestKey) retrieveCache.delete(oldestKey);
    }
    return value;
  },

  async chat(args: {
    query: string;
    sessionIds: string[];
    language: Language;
    topK?: number;
  }): Promise<ChatResponse> {
    return request<ChatResponse>('/api/chat', {
      query: args.query,
      session_ids: args.sessionIds,
      language: args.language,
      top_k: args.topK ?? 5,
    });
  },

  async compare(args: {
    query: string;
    policySessionIds: string[];
    policyNames: string[];
    language: Language;
    /**
     * One rate-card "fact sheet" per policy (1-1 with `policySessionIds`,
     * `null` if the policy isn't in `fd_policies`). Each fact is converted
     * by the backend into a synthetic, high-confidence `[Source N]` block
     * that is concatenated with FAISS retrieval **before** the confidence
     * gate. Mirrors the chat-side `buildRateCardBlocks()` injection so a
     * bank without an indexed brochure still gets a grounded answer.
     */
    policyFacts?: Array<PolicyFact | null>;
  }): Promise<CompareResponse> {
    return request<CompareResponse>('/api/compare', {
      query: args.query,
      policy_session_ids: args.policySessionIds,
      policy_names: args.policyNames,
      language: args.language,
      policy_facts: args.policyFacts ?? null,
    });
  },

  async health(): Promise<{ status: string; ollama: string }> {
    const res = await fetch(`${BASE}/api/health`, { cache: 'no-store' });
    return (await res.json()) as { status: string; ollama: string };
  },
};
