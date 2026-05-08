# Vernacular FD Advisor — Project Overview (v2)

> A complete, head-to-head-comparable description of the system as it exists in this repository today, after the v3 gap-analysis pass and the multilingual + theming + voice upgrades.

**Tagline:** *आपकी भाषा में, आपके पैसे की सलाह* — multilingual, citation-grounded, RBI-aware fixed-deposit assistant for Indian retail depositors.
**Version:** 2.0.0 (Hack to the Future · May 2026)
**Repo root:** `vidyakosh/`
**Built on top of:** v1 spec (the previous edition of this file is preserved in git history).

---

## 1. Product overview

### 1.1 What it is

A **15-language**, citation-grounded retrieval-augmented assistant for **Indian retail fixed-deposit decisions**, built around official RBI / DICGC / Income-Tax sources and bank-issued FD brochures. It answers, cites, computes deterministically, compares banks side-by-side, explains jargon — and **never** gives advice or names a "best" bank.

### 1.2 Target user

Tier 2/3 Indian depositors who are uncomfortable with English-only banking apps. The driving persona is **Ramesh Kumar, 52, retired government employee, Lucknow** (see `README.md#who-this-is-for`):

- Has ₹15 lakh from his retirement corpus to invest.
- Types in Hindi on Android. Cannot use English apps comfortably.
- Saw an SFB advertisement offering 8.75% interest — wants to know if it's safe.
- Doesn't know what DICGC means or that his deposits are insured up to ₹5L.

Every feature in the system traces back to Ramesh.

### 1.3 Demo moments

1. **Vernacular RAG chat** (`/chat`) — voice-first, citation-rendered, picks one of 15 Indian languages.
2. **Side-by-side compare** (`/compare`) — pick 2–4 bank policies, fire one query in parallel, get one cited answer per bank + a neutral AI summary.
3. **Discover** (`/discover`) — policy grid + a behavioural-insights chip backed by real transaction data (see §13).
4. **Deterministic math** — every maturity / TDS calculation cites a green-monospace formula card (`₹P × (1 + r/100/4)^(4×y) = ₹M`) labelled "Computed by deterministic code — not LLM arithmetic."

### 1.4 Non-goals

- Mutual funds, AIFs, SIFs, equity, insurance — gracefully **routed out of scope** by the intent router (§6) before retrieval ever runs.
- Personalised investment advice — explicitly forbidden in every system prompt and enforced by a **multi-rule compliance filter** (§7) that redacts violations and appends an educational disclaimer.
- Cloud LLM during demo — runs on **local Ollama** (`qwen2.5:7b`).

---

## 2. High-level architecture

```
┌───────────────────────────┐                ┌────────────────────────────┐
│   Next.js 15 (App Router) │                │   FastAPI (Python 3.12)    │
│   Vercel AI SDK · React 19│                │   RAG backend · port 8000  │
│   Zustand · Tailwind      │                │                            │
│                           │                │  • /api/ingest             │
│  /chat  /compare /discover│                │  • /api/retrieve           │
│  /onboarding              │                │  • /api/chat (full RAG)    │
│                           │                │  • /api/compare            │
│  /api/chat  ── stream ──► │ ── /retrieve ►│  • /api/health             │
│  /api/compare             │                │  • /api/insights  (NEW)    │
│  /api/insights (proxy)    │                │                            │
│  /api/ingest (proxy)      │                │  Ingestion → Chunk → BGE-M3│
│  /api/discover /health    │                │  → FAISS IndexFlatIP       │
│                           │                │  Intent router → Hybrid    │
│  Streams sources + tokens │                │  retrieve → Rerank →       │
│                           │                │  Confidence gate → Generate│
│                           │                │  → DICGC notice → Compliance│
└───────────┬───────────────┘                └─────────┬──────────────────┘
            │                                          │
            ▼                                          ▼
┌──────────────────────┐                   ┌──────────────────────────────┐
│ Postgres (Neon)      │                   │ Ollama qwen2.5:7b · port 11434│
│ via Drizzle ORM      │                   │ BGE-M3 embeddings (CPU/MPS)   │
│  • sessions/messages │                   │ MS-MARCO MiniLM cross-encoder │
│  • fd_policies       │                   │ FAISS files on disk           │
└──────────────────────┘                   └──────────────────────────────┘
```

The contract between the two halves is a small set of REST endpoints; everything else (streaming, tool-calling, persistence) lives on the Next.js side.

---

## 3. Stack

| Layer | Tech |
|---|---|
| LLM | Ollama `qwen2.5:7b` (local; tool-calling, multilingual) |
| Embeddings | `BAAI/bge-m3` via `sentence-transformers` (single multilingual model) |
| Reranker | `cross-encoder/ms-marco-MiniLM-L-6-v2` (graceful RRF-only fallback if unavailable) |
| Vector DB | FAISS per-session `IndexFlatIP`, persisted to `rag_backend/data/<session>/` |
| Auth | Clerk (toggle-able; runs in shim mode for demo) |
| Database | Neon Serverless Postgres + Drizzle ORM |
| Frontend | Next.js 15 (App Router) · React 19 · Tailwind (CSS-variable palette) · Vercel AI SDK · Zustand |
| Backend | FastAPI + Python 3.12 / 3.13 (the runtime explicitly refuses 3.14 with a friendly error message because `pydantic-core` doesn't ship 3.14 wheels yet) |
| TTS / STT | Web Speech API (graceful fallback chain across 15 BCP-47 locales) |

---

## 4. Languages — 15 supported

The Language type is the **single source of truth** in `store/app-store.ts`. Every prompt/template/UI surface follows it.

| Code | Native | English | Speakers | Script |
|---|---|---|---|---|
| `hi` | हिन्दी | Hindi | 600M+ | Devanagari |
| `bho` | भोजपुरी | Bhojpuri | 52M+ | Devanagari |
| `mai` | मैथिली | Maithili | 34M+ | Devanagari |
| `mr` | मराठी | Marathi | 83M+ | Devanagari |
| `bn` | বাংলা | Bengali | 230M+ | Bengali |
| `as` | অসমীয়া | Assamese | 15M+ | Bengali / Assamese |
| `or` | ଓଡ଼ିଆ | Odia | 38M+ | Odia |
| `gu` | ગુજરાતી | Gujarati | 56M+ | Gujarati |
| `pa` | ਪੰਜਾਬੀ | Punjabi | 33M+ | Gurmukhi |
| `ur` | اُردُو | Urdu | 70M+ | Nasta'liq (RTL) |
| `ta` | தமிழ் | Tamil | 75M+ | Tamil |
| `te` | తెలుగు | Telugu | 81M+ | Telugu |
| `kn` | ಕನ್ನಡ | Kannada | 44M+ | Kannada |
| `ml` | മലയാളം | Malayalam | 35M+ | Malayalam |
| `en` | English | English | Global | Latin |

**Per-language assets translated:**
- `SOURCE_LABEL` (citation prefix — `[स्रोत 3]`, `[ஆதாரம் 3]`, etc.)
- `NOT_FOUND_LINE` (regulatory question with no matching context)
- `DICGC_NOTICE` (deposit-insurance footer)
- `_LANG_DIRECTIVE` (the `LANGUAGE LOCK:` block — see §8)
- `OUT_OF_SCOPE` message
- `EMPATHY_PREFIX` (for safety / panic intents)
- Compliance disclaimer
- Gated "I could not find a reliable answer" decline

**CSS:** `app/globals.css` ships per-script `font-family` (`Noto Sans Bengali / Tamil / Telugu / Kannada / Malayalam / Gujarati / Gurmukhi / Oriya / Nastaliq Urdu`). Urdu also gets `direction: rtl` automatically. The "devanagari" CSS class is now correctly applied only for `hi / bho / mai / mr` via `isDevanagari()` in `lib/i18n.ts`.

**STT/TTS:** BCP-47 locales for all 15 languages (`hi-IN`, `mr-IN`, `bn-IN`, `or-IN`, `pa-IN`, `ur-IN`, `ta-IN`, `te-IN`, `kn-IN`, `ml-IN`, etc.) wired through `useSpeechToText` and `useTextToSpeech`.

---

## 5. RAG pipeline — top to bottom

The fully-walked path of a query lives in `rag_backend/pipeline/rag_pipeline.py::query()`. In order:

1. **Intent classification** (§6) — query goes through `classify()`. If `out_of_scope`, return localized scope message immediately, **no retrieval**, no LLM call.
2. **Routing** — intent dictates which `kb_*` sessions to search and the top-k. E.g. `safety_doubt` prioritises `kb_dicgc` then `kb_rbi_master`; `calculation` prioritises `kb_rbi_master`.
3. **Hybrid retrieval** — BM25 + dense (`bge-m3`) inside FAISS, fused via RRF. Top-20 candidates.
4. **Cross-encoder rerank** — MS-MARCO MiniLM produces a sigmoid-normalised `final_score` per chunk. Falls back to RRF-only on low-RAM machines (`reranker.cross_encoder_active()`).
5. **Confidence gate** (§9) — declines to answer if the top score is below threshold *and* fewer than 2 supporting sources are found.
6. **Context build** — top chunks rendered as `[स्रोत N] (doc — page P — relevance R%)`-prefixed blocks, in the user's source-label language.
7. **Prompt build** — `LANGUAGE LOCK:` directive bookended top + bottom of the system prompt; `RETRIEVED CONTEXT —` block in the middle; SFB DICGC instruction at the very end.
8. **Generate** — Ollama `qwen2.5:7b`, temperature 0.1, max 900 tokens.
9. **Empathy prepend** — for `emotional_panic` / `safety_doubt`, prepend the per-language empathy line.
10. **DICGC post-process** — if the response mentions a small finance bank, append the localized DICGC notice exactly once.
11. **Compliance filter** (§7) — V1/V4/V7/V9 rule set redacts disallowed phrases and appends the educational disclaimer. Logs `[COMPLIANCE FAIL]` to stdout when triggered.
12. **Return** — `{answer, sources, context_blocks, intent, gated}`.

The Next.js streaming path (`app/api/chat/route.ts`) mirrors most of this in TypeScript so the user sees streamed tokens with the same guardrails — see §11.

---

## 6. Intent router

**File:** `rag_backend/retrieval/intent_router.py` and `lib/intent-router.ts` (mirror).

A regex classifier — fast, deterministic, no LLM call — that maps a query to one of:

`out_of_scope · emotional_panic · calculation · tax_clarification · procedural_help · senior_citizen_special · safety_doubt · compare_rates · product_definition · regulatory_status · complaint · general_fd`

**Out-of-scope catches:** SIF, AIF, PMS, mutual fund / MF, equity, stock, ELSS, Nifty / Sensex, NFO, smallcap / largecap / midcap, ETF, index fund, liquid fund, arbitrage fund.

**Effects of intent:**
- `out_of_scope` → return localized SEBI-redirect message; **skip retrieval entirely**. (This single feature is what makes the eval case `vf_015` pass.)
- `emotional_panic` / `safety_doubt` → prioritise `kb_dicgc`, prepend per-language empathy line.
- `calculation` → top-k = 5 (focused), prioritise `kb_rbi_master`.
- `tax_clarification` → bring `kb_tax` into priority list.
- `procedural_help`, `senior_citizen_special`, `complaint`, `regulatory_status` → each maps to its own session priority.

The router is bypassed for the `compare()` pipeline (`skip_intent_router=True`) so policy comparisons don't get mis-classified as out-of-scope.

---

## 7. Compliance filter (multi-rule, mirrored on TS + Python)

**Files:** `rag_backend/generation/compliance_filter.py`, `app/api/chat/route.ts::applyComplianceV4()`.

| Code | Pattern | What it catches |
|---|---|---|
| **V1_BEST_BANK** | `best · sabse achha · recommended · top choice · best option` | Naming a bank as "best" / "recommended" |
| **V4_GUARANTEED** | `guaranteed · 100% safe · no risk · bilkul safe · pura safe · completely safe` | Guaranteed-return / 100%-safe language |
| **V7_PRESSURE** | `limited time · act now · only today · abhi karein · jaldi karein` | Urgency / pressure |
| **V9_PROFANITY** | Devanagari + transliterated + English slurs and profanity | Abusive / profane language |

**On a hit:**
- Each matched phrase is **redacted from the response text**, dangling punctuation is cleaned up.
- An educational disclaimer is appended in the active language ("⚠️ नोट: यह जानकारी केवल शैक्षिक उद्देश्य के लिए है…" / English / Tamil / etc.).
- A `[COMPLIANCE FAIL] lang=<x> violations=[…]` line is logged to stdout.

**Defence-in-depth:** the system prompt itself (in both `lib/prompts.ts` and `rag_backend/generation/vernacular_prompts.py`) explicitly forbids each rule's keywords and lists Hindi/English profanity tokens by name, telling the model to use respectful forms of address. The regex filter is the safety net.

---

## 8. Language Lock — keeping the model on-script

The single biggest UX-affecting bug v1 had: an English query producing a Hindi reply (and vice-versa). The fix is the **`LANGUAGE LOCK:`** block that bookends the system prompt:

```
LANGUAGE LOCK: This conversation is in ENGLISH. Respond in ENGLISH ONLY.
Do NOT use Hindi, Devanagari script, Hinglish, or any other language.
Every sentence MUST be in English. Cite as [Source N]. DICGC notice in English.
```

Every one of the 15 languages has its own `LANGUAGE LOCK:` paragraph. The block sits both **before** `baseRules` and **after** `baseRules` in `getSystemPrompt`, so the model sees the lock both as the first instruction and as the most-recent instruction. Empirically this stops `qwen2.5:7b` from drifting to its dominant training language even when the rest of the prompt has worked examples in another script.

---

## 9. Confidence gate — never hallucinate from weak retrieval

**Threshold:** `0.20` (cross-encoder mode) / `0.18` (RRF-only fallback) with a **2-source escape hatch**.

**Rationale (calibrated, not picked from spec):** the MS-MARCO MiniLM cross-encoder is English-trained. On Hinglish/Hindi queries against Indian-English regulatory chunks, even genuinely-relevant matches sigmoid-normalize to the 0.10–0.45 range. The original spec's `0.55` was rejecting almost every multilingual query. We gate at `0.20` *only when fewer than two sources support the query*. Two-or-more weak matches rules out single-chunk noise → answer; single weak match → decline. Calibrated on 20 manual queries across `hi / bho / en`.

**On gate:** return the per-language `_NO_INFO_MSG` decline plus `gated: True`. The Next.js stream emits `{ type: 'response_kind', kind: 'gated' }` so the UI can show an amber **"Caution — Answer not grounded in available documents"** warning.

---

## 10. Tools (Vercel AI SDK)

**File:** `lib/tools.ts`. All four tools are wired in `app/api/chat/route.ts` with `maxSteps: 6`.

### 10.1 `calculate_maturity` — deterministic finance math

Input: `principal · annualRate · years · isSeniorCitizen`. Output now includes:

- `formula_shown`: `"₹1,00,000 × (1 + 8.5/100/4)^(4×1) = ₹1,08,773"`
- `computation_note`: `"Computed by deterministic code — not LLM arithmetic"`
- `formattedPrincipal / Maturity / Interest / Tds / Net` (INR with lakhs/crores formatting)

The Next.js `onFinish` callback walks `steps[].toolResults` and **appends** the formula block to the streamed text via `appendMaturityFormula`. The chat bubble (`CitedMessageBubble.tsx`) renders it as a **green-monospace card** under the answer with a "📐 निर्धारित गणना" / "📐 Deterministic calculation" label.

### 10.2 `get_fd_rates` — rate-card lookup

Postgres lookup by bank name. Returns rate-regular, rate-senior, premature penalty, DICGC status, RBI-licence flag. Mostly redundant given the rate-card-context injection (§11.3), but the model is allowed to call it as a tie-breaker.

### 10.3 `explain_term` — multilingual glossary

Looks up a term in `lib/glossary.ts` (FD, tenor, maturity, premature withdrawal, TDS, DICGC, SFB, senior-citizen, auto-renewal, 15G, 15H, tax-saver, KYC). Returns the language-specific definition + an everyday rural analogy. Glossary entries fall back to English for languages not yet translated.

### 10.4 `initiate_booking` — stub for the booking demo flow

Returns a 5-step rate-confirmation → KYC → nominee → funds → certificate skeleton.

---

## 11. Frontend — Next.js 15

### 11.1 Routes

- `/` — landing
- `/onboarding` — language picker, intro
- `/chat` — main RAG chat
- `/compare` — side-by-side comparison workbench
- `/discover` — policy grid + behavioural-insights chip
- `/sign-in`, `/sign-up` — Clerk

### 11.2 API routes

| Route | Purpose |
|---|---|
| `POST /api/chat` | Stream tokens via Vercel AI SDK; calls `/api/retrieve`, runs intent router, gate, compliance |
| `POST /api/retrieve` | Pure retrieval pass-through to FastAPI |
| `POST /api/compare` | Parallel RAG + neutral summary |
| `POST /api/ingest` | Upload PDFs into a session |
| `GET /api/discover` | Bank policy grid |
| `GET /api/insights` | **NEW.** Proxies to FastAPI `/api/insights` for the discover-page chip |
| `GET /api/health` | Backend + Ollama health |
| `GET /api/chat/history` | Recent sessions |

### 11.3 Streaming chat — full sequence

Inside `app/api/chat/route.ts::POST`:

1. Auth via Clerk (`auth()`).
2. Body validation: `messages, language (15 codes), kbSessionIds, sessionId?, topK`.
3. **Intent classifier** (`lib/intent-router.ts`) — out-of-scope short-circuits, returns the SEBI-redirect message via a `relayStream` and emits `{ type: 'response_kind', kind: 'out_of_scope' }`.
4. Otherwise, hits `/api/retrieve` for the routed sessions.
5. **Rate-card injection** — `buildRateCardBlocks()` takes the user query, finds bank-name matches in Postgres `fd_policies`, and synthesizes `[Source N]` blocks tagged `faissSessionId: 'rate_card_db'` so Hindi queries asking about Suryoday rates always have authoritative numbers in context (the model cannot reliably tool-call from Hindi).
6. **Confidence gate** — non-synth sources max-score < `0.20` AND fewer than 2 sources → stream the gated decline + `{ kind: 'gated' }`.
7. **System prompt build** with `LANGUAGE LOCK:` and (if intent demanded) `EMPATHY_SYSTEM_ADDON`.
8. **`streamText({ tools: advisorTools, maxSteps: 6, ... })`** runs.
9. `onFinish` post-processes:
   - `addDicgcNotice()` for SFBs
   - `appendMaturityFormula()` if `calculate_maturity` ran
   - `applyComplianceV4()` (V4 + V7 + V9 — multi-pattern redactor + disclaimer)
10. Persists user + assistant messages with their sources + confidence pill into Neon.

### 11.4 UI components — what the user sees

| Component | What it does |
|---|---|
| `ChatInterface` | Main chat shell; routes through `useChat()` (AI SDK). Reads streamed `{ type: 'response_kind' }` events to drive the bubble's bottom bar. Hosts the `ThemeToggle` and `LanguageToggle`. |
| `CitedMessageBubble` | Renders text with inline `[स्रोत N]` / `[Source N]` / `[ஆதாரம் N]` etc. as clickable indigo badges. Renders the deterministic-calculation green-monospace formula card for `calculate_maturity` results. Shows the amber "Answer not grounded" warning **only for `responseKind: 'gated'`** (out-of-scope replies are clean). |
| `SourceDrawer` | Slide-in panel showing the exact retrieved chunk + page + relevance score for any citation badge. |
| `LanguageToggle` | 3/4/5-column responsive grid of all 15 languages, each in its native script, with language-code subtitle and a `script-{name}` font hint. Urdu button gets `dir="rtl"`. |
| `ThemeToggle` | Sun/Moon button. Toggles `class="dark"` on `<html>`, persists in `localStorage`. |
| `VoicePicker` | Settings popover next to the 🔊 Listen button. Lists available voices for the active language ranked best-first; sliders for speed (0.6–1.4×) and pitch (0.7–1.5); 🔊 Test-voice button. |
| `MaturityCalculator` | Sidebar quick calc using `calcMaturitySummary` from `lib/finance-math.ts`. |
| `CompareWorkbench` | Multi-bank parallel-RAG UI. |
| `AdvisorSidebar` | Source picker, KB upload, retrieval pipeline metadata chips. |
| `ChatEmptyState` | Per-language starter prompts (Hindi-first, English fallback for languages without curated prompts). |

### 11.5 Theme system — light minimal aesthetic + dark

**Default:** light mode. Toggle persists in `localStorage`.

**Implementation:** Tailwind's color scales are now **CSS-variable-driven** (`tailwind.config.ts` overrides `slate / indigo / amber / emerald / red / yellow / green / violet / rose` to read `rgb(var(--<color>-<n>) / <alpha-value>)`). The variables are defined in `app/globals.css`:

- `:root` (light) — the slate scale is **inverted** so `bg-slate-950` is a warm cream and `text-slate-100` is near-black; indigo/amber/emerald/red/yellow/green/violet/rose are also inverted so deep "dark mode" panels (`bg-indigo-950`) become very-light tints.
- `:root.dark` — original Tailwind values restored bit-for-bit.

This means the **existing component classes don't change** — `bg-slate-900/60` is a dim glass panel in dark and a soft cream panel in light. Confidence pills are contrast-tuned per theme via `:root.dark .confidence-high` overrides. Light mode also gets a subtle indigo + saffron radial-gradient wash on `body`.

A pre-hydration script in `app/layout.tsx` reads `localStorage.vfd-advisor-theme` and adds the `dark` class before first paint to avoid flash; `<html suppressHydrationWarning>` opts out of React's hydration mismatch warning at that node only.

### 11.6 Voice — text-to-speech

**File:** `hooks/useTextToSpeech.ts`.

- **Voice ranking** — `scoreVoice()` ranks installed Web Speech voices for the target language. Higher score for *Microsoft Natural / Neural*, *Google* cloud voices, *Apple Premium / Enhanced* (Lekha / Veena / Rishi for hi/en-IN). Penalises old robotic *Compact* / *Eloquence* voices.
- **Tuned for clarity** — `rate=1.0`, `pitch=1.05`, `volume=1.0`. (Was `rate=0.85, pitch=1` — slow and muddy.)
- **Async voice list** — listens to `onvoiceschanged` so Chrome's lazy-loaded voices are captured.
- **User overrides** — `setRate`, `setPitch`, `setPreferredVoice(language, voiceName)` — all persist via `localStorage`.
- **Citation stripping** — the regex in `stripCitations()` strips citation badges in **all 15 scripts** (`[स्रोत N]`, `[ஆதாரம் N]`, `[మూలం N]`, `[ಮೂಲ N]`, `[உৎস N]`, `[ਸਰੋਤ N]`, `[સ્રોત N]`, `[ഉറവിടം N]`, `[ଉତ୍ସ N]`, `[ماخذ N]` …) plus markdown asterisks/underscores so the listener never hears "open-bracket-source-three-close-bracket".

The `VoicePicker` popover in the chat bubble exposes all this — click ⚙️ next to 🔊 Listen.

---

## 12. Backend — FastAPI

**Entrypoint:** `rag_backend/main.py`. Refuses to boot on Python 3.14+ with a friendly message about `pydantic-core` wheel availability.

**Routes** (`rag_backend/api/routes.py`):

| Route | Auth | Purpose |
|---|---|---|
| `GET /api/health` | none | `{ status, ollama, model_loaded, indexed_sessions }` |
| `GET /api/insights` | none | Aggregate behavioural insights (no PII) |
| `POST /api/ingest` | `X-API-Key` | PDF/MD upload → chunk → index |
| `POST /api/retrieve` | `X-API-Key` | Pure retrieval (used by Next.js) |
| `POST /api/chat` | `X-API-Key` | Full RAG (used by eval and direct callers) |
| `POST /api/compare` | `X-API-Key` | Multi-bank parallel comparison |

**Modules:**

- `ingestion/loader.py` — PDF / TXT / MD parsing.
- `chunking/engine.py` — sentence-aware chunker that respects Devanagari danda (।) and double-danda (॥) as first-class sentence boundaries.
- `embeddings/factory.py` — BGE-M3 singleton, MPS-aware on macOS.
- `vectorstore/faiss_store.py` — per-session `IndexFlatIP`, persisted to disk.
- `retrieval/hybrid_retriever.py` — BM25 + dense fused via RRF.
- `retrieval/reranker.py` — MS-MARCO MiniLM with `cross_encoder_active()` flag exposed.
- `retrieval/intent_router.py` — see §6.
- `retrieval/query_preprocessor.py` — language detection, expansion.
- `generation/vernacular_prompts.py` — per-language prompts, source labels, DICGC notices, language-lock directives, base rules.
- `generation/llm_handler.py` — Ollama client.
- `generation/compliance_filter.py` — V1/V4/V7/V9 (see §7).
- `pipeline/rag_pipeline.py` — `query`, `compare`, `retrieve_only`, `ingest`.
- `analytics/insights.py` — see §13.
- `eval/run_eval.py` — see §14.
- `startup/preload_kb.py` — bulk-indexes the Builder Pack regulatory PDFs on first boot.

---

## 13. Transaction insights — `/api/insights`

**Files:** `rag_backend/analytics/{insights.py, fd_bookings.csv, fd_rate_check_dropoffs.csv}`.

The Builder Pack's `03_transactions/` data is now wired in. The module reads the two CSVs, computes:

- **Premature withdrawal rate per booking language** (e.g. Hindi 23% vs English 14%) — the headline insight that justifies why Hindi-language users see DICGC + penalty information first.
- **Top product types per language** (via `Counter.most_common(3)`).
- **Booking conversion rate per language** — % of rate-check sessions that converted to a booking within 24h.
- **Single-sentence `key_insight()`** for the discover-page chip.

The chip on `/discover` reads this from `GET /api/insights` (proxied through Next.js to avoid CORS) and renders an indigo callout above the policy grid:

> 📊 **User Behavior Insight:** *Hindi-language users break FDs early X% of the time vs Y% for English users — making penalty and DICGC explanation the highest-value feature for vernacular users.*

This converts the generic "we built for vernacular users" claim into a data-backed insight Q&A judges always probe.

---

## 14. Evaluation — file-driven, 15 cases

**Files:** `rag_backend/eval/vernacular_fd_eval.json` (Builder Pack v3 case set) + `rag_backend/eval/run_eval.py` (file-driven runner).

**Cases:** vf_001 … vf_015 covering Hindi, Hinglish, Tamil (`vf_003`), Bengali (`vf_007`), Kannada (`vf_012`), DICGC accrued-interest edge case (`vf_013`), multi-bank ₹4L×4 DICGC (`vf_014`), SIF out-of-scope (`vf_015`), and the two-layer tax-math case `vf_004` (₹3L FD @ 7.5% / 30% slab — TDS *not* triggered, ITR liability ₹6,750).

**Judge:** `qwen2.5:7b` with a JSON rubric (factual_correctness, compliance, language_match, tone, no_hallucinated_advice). On malformed judge JSON, falls back to a deterministic substring judge with comma + ₹ tolerant numeric matching.

**`LANG_SESSION_MAP`** routes each language code to the appropriate KB sessions; the runner picks `top_k=5`, calls `pipeline/rag_pipeline.py::query()`, and tabulates pass/fail + per-dimension averages.

**Run:**

```bash
cd rag_backend && python -m eval.run_eval
```

**Acceptance target:** ≥ 11/15 PASS (73%+). Critical PASSes: `vf_004`, `vf_013`, `vf_015`.

Output → `rag_backend/eval/results_latest.json` plus a console summary block worth screenshotting for the demo.

---

## 15. Database schema (Drizzle / Neon)

`lib/schema.ts` (unchanged from v1):

| Table | Columns |
|---|---|
| `users` | `id (text PK from Clerk), createdAt` |
| `sessions` | `id, userId, title, language, kbSessionIds (json string[]), createdAt, updatedAt` |
| `messages` | `id, sessionId, role, content, sources (jsonb), confidence ('low' \| 'medium' \| 'high'), createdAt` |
| `fd_policies` | `id, bankName, bankType, rateRegular, rateSenior, minDeposit, maxTenorDays, prematurePenalty, dicgcCovered, rbiLicensed, taxSaverAvailable, notes, faissSessionId` |

Seeded by `scripts/seed.ts` with rate-card data for Suryoday, Ujjivan, ESAF, Equitas, AU SFB, HDFC, ICICI, Axis, SBI.

---

## 16. Knowledge base — what's indexed

`rag_backend/knowledge_base/documents/` contains:

```
rbi_circulars/
  RBI_FD_DICGC_summary.md          ← multi-bank ₹4L×4 example,
                                     vf_004 worked TDS / ITR example
dicgc/
  DICGC_act_notes.md
tax_rules/
  TDS_FD_section_194A.md
bank_brochures/
  Suryoday_SFB_FD_brochure.pdf
  Ujjivan_SFB_FD_brochure.pdf
  ...
sebi/
  KYC_VKYC_overview.md
```

Each is preloaded into a `kb_<name>` FAISS session on backend boot. New PDFs uploaded via `/api/ingest` create their own `kb_upload_<short-id>` sessions.

---

## 17. Demo prep

| File | Purpose |
|---|---|
| `DECISIONS.md` | Architecture decisions log: built/cut/known-gaps tables. Updated to reflect the calibrated `0.20` confidence gate, the V9 profanity guard, and the language-lock framing. |
| `demo_queries.txt` | 7 pre-tested copy-paste queries covering core RAG, emotional panic, DICGC edge case, deterministic math, two-layer tax math, out-of-scope gate, and compare workbench. |
| `demo_setup.sh` | One-command boot: starts Ollama, pre-warms `qwen2.5:7b`, runs the FastAPI backend, runs `npm run dev`, and prints the right URLs. `chmod +x` applied. |
| `README.md#who-this-is-for` | Ramesh Kumar persona — the human at the centre of every product decision. |
| `README.md#90-second-explanation` | Plain-language pitch covering intent router, hybrid retrieval, confidence gate, deterministic math, transaction-data backing, and DECISIONS.md as the trade-offs reference. |

---

## 18. Implementation checklist — what's actually shipped

### A. v3 gap-analysis (Tasks 1–8)

- [x] **Task 1** — Eval upgraded to **15 file-driven cases** (`vernacular_fd_eval.json` + new `run_eval.py` with LLM judge + deterministic fallback).
- [x] **Task 2** — Compliance filter (V1/V4/V7) added in both `compliance_filter.py` and `app/api/chat/route.ts::applyComplianceV4`. Wired into `rag_pipeline.query()` after DICGC post-processing.
- [x] **Task 3** — Intent router (`intent_router.py` + `lib/intent-router.ts`). Out-of-scope short-circuits retrieval. Empathy add-on for emotional/safety queries. Compare bypasses the router.
- [x] **Task 4** — Retrieval-confidence gate (calibrated to `0.20` cross-encoder / `0.18` dense-only with 2-source escape hatch). Streams `response_kind: 'gated'` event; UI shows amber warning.
- [x] **Task 5** — Transaction insights: `analytics/insights.py`, `analytics/fd_bookings.csv`, `analytics/fd_rate_check_dropoffs.csv`, `GET /api/insights` (FastAPI + Next.js proxy), discover-page chip.
- [x] **Task 6** — Calculation audit trail: `calculate_maturity` returns `formula_shown` + `computation_note`; bubble renders the green-monospace formula card; streamed text also gets the formula appended via `appendMaturityFormula`.
- [x] **Task 7** — `DECISIONS.md` at repo root; built/cut/known-gaps tables.
- [x] **Task 8** — `demo_queries.txt`, `demo_setup.sh` (executable), README "Who This Is For" persona + 90-second explanation.

### B. Issues found during testing → fixes

- [x] **Multilingual confidence gate too aggressive** — calibrated from `0.55` (English-only spec) to `0.20` with a 2-source escape hatch.
- [x] **Out-of-scope replies showed amber "Low confidence" pills** — `CitedMessageBubble.showRetrievalWarning` and `showEvidencePill` now branch on `responseKind` so out-of-scope replies are clean.
- [x] **English query → Hindi reply** — `LANGUAGE LOCK:` directive bookended top + bottom of the system prompt; English variant explicitly forbids Devanagari/Hinglish; empathy add-on language-aware.
- [x] **`qwen2.5:7b` emitted Devanagari profanity** under emotionally-charged prompts — added **V9_PROFANITY** rule (Devanagari + transliterated + English tokens) on both TS and Python; profanity redacted; `[COMPLIANCE FAIL]` logged; system prompt explicitly forbids the same tokens as defence-in-depth.

### C. Multilingual expansion (15 languages)

- [x] **Single source-of-truth `Language` type** in `store/app-store.ts` with 15 codes + `SUPPORTED_LANGUAGES` array.
- [x] **`LANGUAGE_LABELS`** with `native`, `english`, `speakers`, `script` for all 15.
- [x] **`LanguageToggle`** rewritten as a 3/4/5-column responsive grid; per-script font class; RTL `dir` for Urdu.
- [x] **`app/globals.css`** — per-script font-family rules (Noto Sans Bengali / Tamil / Telugu / Kannada / Malayalam / Gujarati / Gurmukhi / Oriya / Nastaliq Urdu).
- [x] **`SOURCE_LABEL`, `NOT_FOUND_LINE`, `DICGC_NOTICE`, `_LANG_DIRECTIVE`, `OUT_OF_SCOPE`, `EMPATHY_PREFIX`, `_DISCLAIMER`, `GATED_DECLINE`, `_NO_INFO_MSG`** translated to all 15 languages on both TS and Python.
- [x] **Zod enums** in `app/api/chat/route.ts`, `app/api/retrieve/route.ts`, `app/api/compare/route.ts`, `lib/tools.ts` all expanded to 15 codes.
- [x] **`useSpeechToText`, `useTextToSpeech`** — BCP-47 locale codes for all 15.
- [x] **`isDevanagari()`** correctly returns `true` only for `hi/bho/mai/mr`; other Indic scripts get their own font classes.
- [x] **Glossary** — `GlossaryEntry` is `Partial<Record<Language, string>>` so non-translated languages fall back to English in `lookupTerm`.
- [x] **`LANG_SESSION_MAP`** in eval runner expanded to all 15.

### D. Theme system

- [x] **Tailwind palette CSS-variable-driven** (slate / indigo / amber / emerald / red / yellow / green / violet / rose). Existing components untouched.
- [x] **Light mode default** with inverted slate / indigo / amber / etc. scales.
- [x] **Dark mode preserved** bit-for-bit via `:root.dark`.
- [x] **`ThemeToggle`** component (`components/ui/ThemeToggle.tsx`) with persistence and accessibility.
- [x] **Pre-hydration inline script** in `app/layout.tsx` reads `localStorage` before paint; `suppressHydrationWarning` on `<html>` to silence the intentional mismatch warning.
- [x] Toggle wired into chat header, discover page, compare workbench, landing page.
- [x] Confidence pills contrast-tuned per theme.
- [x] Light mode body gets a subtle indigo + saffron radial-gradient wash.

### E. Voice / TTS upgrades

- [x] **Best-voice picker** — `scoreVoice()` ranks Microsoft Neural / Google / Apple Premium voices first, penalises robotic Compact/Eloquence.
- [x] **Tuned utterance params** — `rate=1.0`, `pitch=1.05`, `volume=1.0` for sharp, clear output.
- [x] **`onvoiceschanged`** handled so Chrome's lazy-loaded voice list is captured.
- [x] **User-facing voice picker** (`components/chat/VoicePicker.tsx`) — popover listing all available voices for the active language ranked best-first; speed + pitch sliders; 🔊 Test-voice button. Choices persist per-language in `localStorage`.
- [x] **Citation regex** strips badges in all 15 scripts so they're never read aloud.

### F. Quality gates

- [x] **TypeScript** clean — `npx tsc --noEmit` exits 0.
- [x] **Linter** clean on all touched files.
- [x] Backend imports clean; FastAPI routes register correctly (`/api/insights` registered after `router = APIRouter()`).
- [ ] **Eval pass-rate** — target ≥ 11/15. Run `cd rag_backend && python -m eval.run_eval` to fill in the actual figure and update the placeholder line in `DECISIONS.md`.
- [ ] **Eval screenshot** — save the final summary block to `rag_backend/eval/results_screenshot.png`.

### G. Final-verification matrix (run before demo day)

| Surface | Test | Expected |
|---|---|---|
| Health | `curl :8000/api/health` | `ollama: reachable`, `model_loaded: true` |
| Eval | `python -m eval.run_eval` | 15 cases run, ≥11/15 PASS, vf_004 / vf_013 / vf_015 all PASS |
| Compliance | `Is Suryoday SFB 100% safe?` | `100% safe` redacted, disclaimer appended, `[COMPLIANCE FAIL]` logged |
| Profanity | Rude user query | No abuse in response, V9 redaction if model emits any |
| Intent | `mutual fund suggest karo` | Out-of-scope decline, no retrieval, no amber |
| Empathy | `bank fail ho gaya to?` | Empathy line prepended, DICGC explanation cited |
| Gate | Off-topic non-FD question | Amber unreliable warning, no fabrication |
| Math | `1 lakh FD 8.5% pe 1 saal` | Formula card shown with `₹1,00,000 × (1 + 8.5/100/4)^(4×1) = ₹1,08,773` |
| DICGC edge | `Does DICGC cover include accrued interest?` | Yes, principal + interest combined to ₹5L (vf_013) |
| Multi-bank | `₹4L × 4 banks = covered?` | Each ₹4L independently insured up to ₹5L (vf_014) |
| Language lock | English query, English UI | Reply 100% English, `[Source N]` citations |
| Multilingual | Tamil / Bengali / Kannada / Marathi prompts | Reply in correct script with localized DICGC notice |
| Insights | `GET /api/insights` | Valid JSON with `key_insight`; `/discover` shows the chip |
| Theme | Toggle Sun/Moon | Light ↔ dark flips entire UI; persists across reload |
| Voice | Click ⚙️ next to 🔊 Listen | Voice list ranked best-first; speed/pitch sliders work; test button speaks sample |
| Compare | `/compare` Suryoday + Ujjivan | Two cited answers in parallel + neutral 3-sentence summary |

---

**End of overview.** For the *why* behind every architectural decision, see `DECISIONS.md`. For the demo-day script, see `demo_queries.txt` and `demo_setup.sh`.
