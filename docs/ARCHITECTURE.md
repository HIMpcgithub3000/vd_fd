# Architecture — Vernacular FD Advisor

> _A judge-ready, single-page architectural walkthrough. Read this with
> `PROJECT_OVERVIEW.md` for full context. Read this alone for the 5-minute
> "why each piece matters" pitch._

---

## 1. The user this product was built for

**Ramesh Kumar, 52, retired BSNL technician, Lucknow.** ₹15 lakh retirement
corpus. Reads Hindi on Android. Saw a Suryoday SFB ad offering 8.75% interest.
Doesn't know what DICGC is. Cannot use English banking apps comfortably.

Every architectural decision below traces back to Ramesh.

---

## 2. End-to-end query flow

```
User types in Hindi / Hinglish / Tamil / one of 15 languages
        │
        ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Next.js 15 / app/api/chat/route.ts                                     │
│                                                                        │
│  1. Auth (Clerk shim)                                                  │
│  2. Mixed-script detection  (Hinglish?)  ─ Tier 2.8 polish             │
│  3. Intent router  (lib/intent-router.ts)                              │
│       │                                                                │
│       ├─ out_of_scope  ─►  return localized SEBI-redirect              │
│       │                    + stream { kind: 'out_of_scope' }           │
│       │                    NO retrieval. NO LLM call.                  │
│       │                                                                │
│       └─ in-scope      ─►  proceed                                     │
│                                                                        │
│  4. POST /api/retrieve  (with TTL cache + 25s timeout)                 │
└────────────────────────────────┬───────────────────────────────────────┘
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│ FastAPI / rag_backend                                                  │
│                                                                        │
│  5. Query preprocessor  (rag_backend/retrieval/query_preprocessor.py)  │
│       Layer 1: vernacular phrase normalization                         │
│         "पैसा डूब जाएगा?" ─►  "DICGC deposit insurance safety …"      │
│         "FD फूट गया" ─►  "premature withdrawal closure"                │
│       Layer 2: synonym + transliteration expansion                     │
│         "byaj" ─►  "ब्याज + interest + rate + return + …"             │
│                                                                        │
│  6. Hybrid retrieval  (rag_backend/retrieval/hybrid_retriever.py)      │
│       a. BGE-M3 dense → FAISS IndexFlatIP, top-20                      │
│       b. BM25 sparse over the dense candidates                         │
│       c. Reciprocal Rank Fusion (k=60)                                 │
│       d. MMR diversification (token + page overlap)                    │
│                                                                        │
│  7. Cross-encoder rerank  (MS-MARCO MiniLM, sigmoid-normalized)        │
│       Falls back gracefully to RRF-only if model fails to load         │
│                                                                        │
│  8. Build context blocks                                               │
│       Each chunk gets denseScore + rerankScore + rrfScore in output    │
│       (used by the SourceDrawer telemetry panel)                       │
│                                                                        │
│  9. Confidence gate                                                    │
│       Trigger ⇔  best_score < 0.20  AND  fewer than 2 supporting srcs  │
│       Calibrated against the multilingual reranker (English-trained    │
│       so Hindi/Hinglish queries naturally score lower)                 │
│       2-source escape hatch prevents over-gating                       │
│                                                                        │
│ Returns { sources, context_blocks, meta: { chunks_searched,            │
│   top_score, retrieval_path, sessions_queried, … } }                   │
└────────────────────────────────┬───────────────────────────────────────┘
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Back in Next.js — app/api/chat/route.ts                                │
│                                                                        │
│ 10. Rate-card injection                                                │
│       Match user query against fd_policies (Postgres)                  │
│       Synthesize [Source N] blocks tagged faissSessionId='rate_card_db'│
│       So Hindi "सूर्योदय" still has authoritative numbers in context  │
│                                                                        │
│ 11. Confidence gate (TS mirror)                                        │
│       If retrieval gated  ─►  stream localized decline                 │
│                              + stream { kind: 'gated' }                │
│                                                                        │
│ 12. System-prompt build  (lib/prompts.ts)                              │
│       LANGUAGE LOCK ▸▸▸ baseRules ▸▸▸ LANGUAGE LOCK ▸▸▸ context        │
│       (lock bookended both ends — empirically stops the dominant-      │
│        training-language drift; mixed-script flag relaxes lock to      │
│        Hinglish for natural code-switching users)                      │
│                                                                        │
│ 13. streamText(maxSteps: 6) on Ollama qwen2.5:7b                       │
│       Tools: calculate_maturity · get_fd_rates · explain_term ·        │
│              initiate_booking                                          │
│                                                                        │
│ 14. onFinish post-process                                              │
│       a. addDicgcNotice()       — append for SFB mentions              │
│       b. appendMaturityFormula() — green-monospace audit trail         │
│       c. applyComplianceV4()    — V1/V4/V7/V9 redaction + disclaimer   │
│                                                                        │
│ 15. Persist user + assistant turns to Neon Postgres (sources, scores,  │
│     confidence)                                                        │
└────────────────────────────────┬───────────────────────────────────────┘
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Streamed UI — components/chat/CitedMessageBubble.tsx                   │
│                                                                        │
│  • Authority dot on each [Source N]  (RBI=sky / DICGC=emerald /         │
│    Tax=violet / Bank=indigo / Rate-card=amber / Upload=slate)          │
│  • Hover preview: 180-char chunk snippet + authority chip              │
│  • Evidence highlighting: phrases that exist verbatim in a cited       │
│    chunk get a soft amber underline                                    │
│  • Telemetry strip: "27 chunks searched · 78% top score · BM25 +       │
│    dense + cross-encoder · 4 indices"                                  │
│  • Source drawer: authority chip in header + Dense / Rerank scores     │
│  • Sources expansion: sorted by authority weight first                 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Trust hierarchy — why every citation has a colored dot

| Tier | Weight | Color | What it is |
|---|---|---|---|
| **RBI** | 100 | sky | RBI master directions, circulars |
| **DICGC** | 95 | emerald | Deposit-insurance authority |
| **Tax** | 85 | violet | Income-Tax Act §194A, TDS rules |
| **SEBI / KYC** | 80 | rose | KYC/VKYC / out-of-scope redirect |
| **Rate-card** | 70 | amber | Bank-issued current rates (DB) |
| **Bank brochure** | 60 | indigo | Specific bank's FD product brochure |
| **Upload** | 30 | slate | User-uploaded knowledge source |

The "View sources" expansion sorts by authority weight **first**, score
second. So even if a Suryoday brochure sentence ranks 85% but the matching
RBI directive only hits 62%, the RBI source surfaces above. Trust
hierarchy beats raw vector similarity.

---

## 4. Why every component exists — the "why this matters" map

### Retrieval

- **BGE-M3 multilingual embeddings** — single embedding model handles all 15 languages without per-language indexes. Hindi queries find English documents and vice-versa.
- **BM25 + dense + RRF** — sparse retrieval catches rare proper nouns ("Suryoday", "ESAF"), dense catches semantic intent ("मुझे पैसा डूबने का डर है"). RRF fuses them without learning a weight.
- **MMR diversification** — prevents same-page repetition (brochures repeat the DICGC paragraph 3+ times).
- **Chunk-level near-dup dedup at ingest (Jaccard ≥0.85)** — same insurance paragraph appears across 4 brochures verbatim. Without dedup, top-5 retrieval was wasting slots on the same content.
- **Cross-encoder rerank with graceful fallback** — improves precision without single-point-of-failure on lower-RAM machines.
- **TTL cache + 25s timeout** — demo-day reliability; judges retry the same prompt several times.

### Trust & explainability

- **Authority hierarchy** — judges see `Verified RBI Source` vs `Bank-issued brochure` at a glance.
- **Retrieval telemetry strip** — every grounded reply shows `27 chunks searched · 78% top · BM25 + dense + cross-encoder`. No black-box AI.
- **Inline source preview** — hover any `[Source N]` for a 180-char chunk popover before clicking through. Cuts clicks for skim-readers.
- **Evidence highlighting** — phrases in the answer that exist verbatim in a cited chunk get a soft amber underline. The user can see exactly what was grounded.
- **Confidence gate (0.20/0.18 + 2-source escape)** — calibrated for multilingual reality, not English-only spec defaults.

### Multilingual

- **15 languages** with per-script fonts (`Noto Sans Bengali / Tamil / Telugu / Kannada / Malayalam / Gujarati / Gurmukhi / Oriya / Nastaliq Urdu`).
- **`LANGUAGE LOCK:` bookended** at both ends of the system prompt. Empirically stops `qwen2.5:7b` from drifting to its dominant training language.
- **Vernacular phrase normalizer** — rural idioms (`पैसा डूब जाएगा`, `FD फूट गया`, `tax katega`) recognized and expanded to canonical English banking concepts so Devanagari documents are still hit.
- **Mixed-script LANGUAGE LOCK** — when a Hindi-mode user types Hinglish, the LOCK softens to allow mixing, matching natural code-switching.

### Safety

- **V1 / V4 / V7 / V9 compliance filter** — multi-rule regex redacts "best bank", "guaranteed", urgency, profanity, and appends an educational disclaimer. Logged to `[COMPLIANCE FAIL]`.
- **Defence-in-depth** — same forbidden tokens are explicitly listed in the system prompt. Filter is the safety net, not the only line.
- **Out-of-scope router** — mutual fund / SIP / equity / NPS / PPF queries get a localized SEBI-redirect. No retrieval, no LLM call.
- **Empathy prefix** — `emotional_panic` / `safety_doubt` intents prepend a localized empathy line before the cited DICGC explanation.

### Numbers

- **Deterministic `calculate_maturity` tool** — every maturity / TDS calculation runs in audited TypeScript, never LLM arithmetic. Output includes `formula_shown: "₹P × (1 + r/4)^(4y) = ₹M"` and `computation_note: "Computed by deterministic code — not LLM arithmetic"`. Rendered as a green-monospace card under the answer.

### UX

- **Light-default minimalist theme** with dark mode preserved. CSS-variable Tailwind palette — same component classes, both modes.
- **Senior-citizen A+ toggle** — boosts root font 16px → 18px → 20px. Critical for the Ramesh persona.
- **Best-voice TTS picker** — ranks Microsoft Neural / Google / Apple Premium voices first. Citations are stripped from the spoken text in all 15 scripts.
- **Pre-hydration theme bootstrap** — no flash-of-wrong-theme.

### Eval

- **35 file-driven cases** across 8 categories: core, noisy_hinglish, spelling_mistakes, transliterated_bhojpuri, emotional_panic, adversarial, low_context, profanity_edge, unsupported_products + per-language Tamil/Marathi/Gujarati cases.
- **LLM-as-judge with deterministic fallback** — when the judge JSON is malformed, fall back to substring + numeric matching.
- **Regression tracking** — every run writes `results_<timestamp>.json`; the runner diffs against the most recent prior run and reports `newly_passing / newly_failing / still_failing`.
- **Auto-generated `eval/REPORT.md`** — judge-readable Markdown with per-language and per-category pass-rates plus the regression diff.

---

## 5. What's deliberately NOT in the architecture

| Not built | Why |
|---|---|
| Multi-agent / autonomous planning | Adds non-determinism. A regex intent router + 4 typed tools cover every demo path. |
| Cloud LLM dependency | Demo must work offline. `qwen2.5:7b` on Ollama is the hill we chose. |
| Redis / Kafka / Kubernetes | Per-process LRU cache + Postgres + FAISS files on disk are sufficient. Scales by horizontal Next.js + sticky FastAPI. |
| Custom embedding fine-tune | BGE-M3 is already multilingual-strong; rerank closes the precision gap. |
| GraphRAG / agentic retrieval | Documents are short, well-structured regulatory PDFs. Hybrid + rerank is right-sized. |

---

## 6. Demo-day surfaces & what each one proves

| URL | Proves |
|---|---|
| `/chat` (Hindi) | Multilingual RAG with citations, authority badges, telemetry, evidence highlight |
| `/chat` (Tamil/Bengali/Kannada) | Genuine 15-language script support, not English-only |
| `/chat` "100% safe?" | Compliance filter redacts violations + appends disclaimer |
| `/chat` "mutual fund?" | Out-of-scope router with localized SEBI redirect, no retrieval |
| `/chat` "1 lakh @ 8.5% for 1 year" | Deterministic green-monospace formula card |
| `/chat` "DICGC accrued interest?" | DICGC edge-case grounding (vf_013) |
| `/compare` Suryoday + Ujjivan | Parallel RAG + neutral 3-sentence summary |
| `/discover` | Transaction-data insight chip ("Hindi users break FDs early X%") |
| Theme + A+ toggle | Light minimal default, senior-citizen typography |
| `python -m eval.run_eval` | 35-case multilingual stress test with regression diff |

---

## 7. One-paragraph summary

Vernacular FD Advisor is a 15-language, citation-grounded retrieval-augmented
assistant for Indian retail FD decisions. It hybrid-retrieves (BM25 + BGE-M3
+ cross-encoder) over RBI / DICGC / Income-Tax / bank-brochure indexes, gates
on calibrated multilingual confidence, computes maturity deterministically
(never LLM arithmetic), enforces compliance via a multi-rule redactor + an
educational disclaimer, and surfaces every retrieved chunk's authority tier,
rerank score, and verbatim-evidence overlap to the user. It runs offline on
local Ollama, is evaluated on 35 multilingual stress cases with regression
tracking, and is themed for an older Hindi-Android-first audience whose
financial literacy depends on trustworthy, explainable answers in their own
language.
