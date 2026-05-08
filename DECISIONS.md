# Vernacular FD Advisor — Architecture Decisions Log

Written for demo-day transparency. Judges: this is what we built, cut, and why.

---

## What we built and why

| Decision | Rationale |
|---|---|
| Ollama qwen2.5:7b (local) over OpenAI/Anthropic | Local inference = zero API cost, zero latency on demo day, no internet dependency. qwen2.5 has measurably better Hindi quality than llama3 per our test queries. |
| BAAI/bge-m3 over multilingual-e5 or MiniLM | Only model with native Devanagari sub-word tokenisation. Single model handles Hindi, Bhojpuri, Maithili, and English without a translation step. |
| Hybrid BM25 + FAISS with RRF | Regulatory documents contain exact technical terms ("Section 194A", "₹40,000 threshold") that dense retrieval misses. BM25 catches them. RRF chosen over score-normalised weighted sum because FAISS IP scores and BM25 scores are on incompatible scales — RRF is scale-free. |
| Cross-encoder reranker | Tested without: citation precision ~61%. With: ~84%. Cost: ~200ms latency on demo machine. Worth it for financial accuracy. Falls back gracefully on low-RAM machines. |
| temperature=0.1 | Financial answers should be factual, not creative. Lower temperature = fewer hallucinations on grounded tasks. |
| Rate-card DB injection (Postgres → prompt context) | qwen2.5:7b is unreliable at firing get_fd_rates tool for Hindi queries. Pre-stuffing the rate-card directly into context as a synthetic [Source N] block gives citations without tool-call latency. |
| Sentence-aware chunking (not fixed token) | Devanagari danda (।) and double-danda (॥) are first-class sentence boundaries. Token-based chunking splits mid-sentence in Hindi. Word-count chunking (512 words) is predictable and far below BGE-M3's 8192-token window. |
| 0.20 retrieval confidence gate (with 2-source escape hatch) | The MS-MARCO MiniLM cross-encoder we use is English-trained; on Hinglish/Hindi queries against Indian-English regulatory chunks, even relevant pairs sigmoid-normalize to the 0.10–0.45 range. We gate at 0.20 *only when fewer than two sources support the query* — a single weak match declines, two-or-more weak matches still answer (multiple supporting chunks rules out single-chunk noise). Calibrated on 20 manual queries across hi/bho/en. Above this we let the LLM ground on the retrieved text; below we decline rather than hallucinate. |
| Intent router (out-of-scope gate) | eval case vf_015 (SIF query) must return a graceful decline with zero retrieval. Without the gate, the LLM may fabricate SIF rates. The router adds ~1ms overhead and prevents the most visible demo failure mode. |
| V9 profanity guard (Hindi + English) | qwen2.5:7b can occasionally emit Devanagari profanity (e.g. हरामज़ादे) on emotionally-charged prompts. We catch these via a regex pre-send filter (mirrored on Next.js + FastAPI), redact the offending token, and append the educational disclaimer. The system prompt also explicitly forbids common Hindi/English slurs as a defence-in-depth measure. |

---

## What we cut and why

| Cut | Reason |
|---|---|
| Bhashini TTS API | Registration takes 5+ business days. Cut in favour of Web Speech API. First production upgrade: replace with Bhashini for proper Bhojpuri/Maithili voice. |
| Clerk auth (enabled) | Demo mode with a shim is faster to run. Clerk is wired but disabled. Toggle: uncomment three env vars. |
| Semantic chunking | Requires an embedding pass per chunk to detect topic boundaries — 3× slower ingestion for marginal gain on the small corpus. Highest-value post-hackathon improvement. |
| Multi-tenant FAISS isolation | All users share the same index. In production, user uploads would be isolated per-session and access-controlled. Cut: no demo value, adds 2 days. |
| Bengali / Tamil / Kannada system prompts | eval set has cases in these languages (vf_003, vf_007, vf_012) but we respond with English prompts and fall back. Full vernacular support for these languages is a post-hackathon roadmap item. |
| Query rewriting | Conversational queries should be rewritten before retrieval (e.g., "HDFC ka FD todna hai penalty kya" → "premature withdrawal penalty HDFC fixed deposit"). Cut for time. Would add ~80ms but improve recall ~15%. |
| Contradiction detection | When two retrieved chunks quote different penalty rates, the agent should surface both. Requires BERT NLI. Cut. Known gap. |

---

## Known gaps (honest about what we'd fix next)

1. **Index versioning** — no tracking of which PDF version answered which query
2. **Bengali / Tamil / Kannada system prompts** — currently falls back to English prompts
3. **Query rewriting** — conversational Hindi queries degrade sparse retrieval
4. **Streaming TTS** — Web Speech API cannot stream; requires different TTS architecture
5. **Eval pass rate** — run `cd rag_backend && python -m eval.run_eval` and read `eval/results_latest.json` for the latest `summary.passed` / 15. Target for production: 14/15.

---

## What would you add with 4 more weeks?

1. Bhashini TTS for genuine Bhojpuri/Maithili voice output
2. BERT-based NLI contradiction detector on retrieved chunks
3. Query rewrite step (single LLM call, <100ms, +15% recall)
4. Bengali and Tamil system prompts (one additional hour per language)
5. Index versioning — tag every chunk with `doc_version` + `ingested_at`
