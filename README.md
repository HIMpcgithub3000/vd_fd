<div align="center">

# Vernacular FD Advisor

**Money information, in your own language — explained safely, with sources.**

*A multilingual, citation-grounded financial assistant for Indian retail depositors.*

[Problem](#1-the-problem) · [Solution](#2-what-the-vernacular-fd-advisor-does) · [Why this approach](#3-why-this-approach) · [Features](#4-core-features) · [System design](#5-system-design) · [What's next](#6-whats-next) · [Run it locally](#how-to-run-it)

</div>

---

## 1. The Problem

> Most financial conversations in India happen in a language the apps don't speak.

Roughly **85% of Indian adults are not comfortable doing financial work in English.** Yet the documents that govern their money — RBI master directions, DICGC deposit-insurance rules, the Income-Tax Act, bank rate-cards — are almost exclusively published in formal English. The mismatch shows up daily:

- A 52-year-old retired clerk in Lucknow sees an SFB advertising **"8.75% interest"** and cannot tell whether his life savings will be safe.
- A homemaker in Patna doesn't know that the words **"DICGC insured"** in tiny English print at the bottom of an app mean *her ₹5 lakh is guaranteed by a government body*.
- A first-time depositor in Madurai pays a **premature-withdrawal penalty** that nobody explained, because the brochure was English-only.

Three forces compound this:

1. **A trust gap.** People hand over their savings without understanding what protects them. Misinformation fills the space — WhatsApp forwards, agents with commissions, half-translated screenshots.
2. **Real-money decisions, hidden complexity.** FDs look simple, but **DICGC ₹5L cover, TDS Section 194A, Form 15G/15H, premature-penalty math, senior-citizen rates** are five different systems that interact.
3. **Generic chatbots are dangerous here.** A free-text LLM will happily invent an interest rate, name a "best" bank, or assure someone their deposit is "100% safe." For finance, fluent confidence without grounding is a liability, not a feature.

The Vernacular FD Advisor exists for the user this gap fails first.

> *Every architectural decision in this repository traces back to one person: Ramesh Kumar, 52, retired government employee, Lucknow — Hindi-first, mobile-first, with ₹15 lakh of retirement money to place safely.*

---

## 2. What the Vernacular FD Advisor Does

A user opens the app on a phone, picks **हिन्दी** (or any of 14 other Indian languages, or English), and asks — by typing or by tapping the mic and speaking:

> *"Suryoday bank mein FD pe kitna byaj milega? Paisa safe hai?"*

Within a few seconds they see:

- **A clear answer in their own language**, written in everyday wording — not officialese.
- **Citations attached to each claim**, linking to the exact RBI / DICGC / bank document and page the line came from. Tapping a citation slides open the original passage so the user can read it themselves.
- **DICGC explained when it matters** — when a Small Finance Bank is mentioned, the answer naturally references the ₹5 lakh deposit-insurance cover, in the user's language.
- **Numbers that come from code, not the AI.** Maturity, interest, TDS, and net-receivable are computed by a deterministic function and shown alongside the formula — labelled "Calculated step by step", never an LLM guess.
- **A polite refusal when the answer isn't in the documents** — instead of inventing one. The user is told to confirm with their bank, and the UI signals it visibly.
- **An optional voice readback** — useful for older users and anyone with low literacy. The reader strips citation markers so the user hears the answer, not the formatting.

The experience is intentionally calm and slow: large readable type, soft trust cues (RBI · DICGC · bank document), no developer chrome, no percentages, no model names — nothing that asks the user to learn the system before learning their own money.

---

## 3. Why This Approach

> If you only build for the happy path in finance, the unhappy paths are the ones that hurt people.

The Vernacular FD Advisor is built around four engineering convictions:

#### 3.1 Retrieval-grounded, not free-form

Every answer the user reads is derived from a chunk of an actual indexed document — RBI master directions, DICGC act notes, the relevant Income-Tax sections, and bank-issued FD brochures. The LLM is given retrieved context, asked to summarise *only* what it can see, and required to cite. This is deliberately less "magical" than a freely chatting model — and far harder to mislead.

#### 3.2 Citations as a first-class UI element

A claim with a citation that the user can open is a fundamentally different artefact from a confident sentence. Citations are rendered inline (`[स्रोत 3]`, `[Source 3]`, `[ஆதாரம் 3]` …), are clickable, and open the underlying passage in a side drawer. Trust isn't asked for — it's shown.

#### 3.3 Deterministic math, never LLM math

LLMs are unreliable arithmeticians. So no number in the product comes from the model. Maturity, quarterly compounding, TDS thresholds, senior-citizen uplift, net receivable — all computed in `lib/finance-math.ts` and surfaced with the formula visible. The chat shows the formula card with a caption that explicitly tells the user it was computed by code.

#### 3.4 Local-first inference

The demo runs on a local **Ollama (`qwen2.5:7b`)** model. No cloud LLM key, no per-token cost, no data leaving the laptop on demo day. This isn't a deployment philosophy — it's a *user-trust* philosophy: a financial assistant that depends on a third-party API has a third-party answering for your money.

#### What we deliberately did not build

- **Multi-agent "investment advisor" loops** — too easy to drift into recommendations the system isn't licensed to make.
- **Free-text generation without retrieval gating** — answering when there's no real source is the single most dangerous failure mode in finance.
- **A "best-bank" recommender** — hard-blocked at the prompt level *and* by a regex compliance filter, because "best" is not a fact, it's a sales pitch.
- **A glossy multi-step "AI workflow"** — the user does not need to see a pipeline; they need to see a clear answer and a source.
- **Cloud-only stack** — the user's lowest-trust moment is the moment their savings get sent to an unfamiliar API.

These omissions are intentional and survive review. Many of them are flashy, none of them are safe in this domain.

---

## 4. Core Features

| Capability | What it gives the user |
|---|---|
| **15 Indian languages** | Hindi, Bhojpuri, Maithili, Marathi, Bengali, Assamese, Odia, Gujarati, Punjabi, Urdu, Tamil, Telugu, Kannada, Malayalam, English. Single source of truth (`store/app-store.ts`); per-script fonts; Urdu is RTL. |
| **Citations on every claim** | `[स्रोत N]` / `[Source N]` rendered as clickable badges; tap to read the original passage. |
| **Polite refusal when grounding is weak** | A retrieval-confidence gate declines answers it cannot back up — instead of guessing — and tells the user to confirm with their bank. |
| **Out-of-scope handling** | Mutual-fund / equity / SIF / NFO questions get a respectful boundary, not an invented answer. |
| **Voice in, voice out** | Web Speech STT for asking; a tuned, ranked TTS picker for listening. The reader strips citation markers in all 15 scripts so the listener hears the answer cleanly. |
| **Deterministic financial math** | Maturity, TDS, senior uplift, net receivable — formula visible, source labelled "Calculated step by step." |
| **DICGC awareness for SFBs** | When a Small Finance Bank is referenced, the ₹5 lakh deposit-insurance protection is naturally explained in the user's language. |
| **Compliance-as-defence-in-depth** | A regex filter (`V1/V4/V7/V9`) redacts "best bank", "100% safe", "act now", and abusive language even if the model emits them; the system prompt forbids the same patterns first. |
| **Side-by-side bank compare** | Two to four banks, one query, parallel grounded answers, a neutral summary — useful when a user is choosing where to place ₹5L. |
| **Senior-citizen typography mode** | Two reading sizes (1.0×, 1.125×, 1.25×) for users with weaker eyesight; works alongside light/dark mode. |
| **Bilingual chrome** | Hindi-first by default; every primary button and heading carries a small English helper line so a parent and a child can share the same screen. |

---

## 5. System Design

The architecture is deliberately small. Two services, one model, one vector store, one database — and a hard rule that nothing flashy gets in if it doesn't serve a grounded answer.

```
              ┌────────────────────────────────────────────┐
              │              User question                 │
              │      (typed or spoken, any of 15 langs)    │
              └───────────────────────┬────────────────────┘
                                      │
                                      ▼
              ┌────────────────────────────────────────────┐
              │  Intent router  (regex, no LLM, ~1ms)      │
              │  • out-of-scope → polite boundary, stop    │
              │  • emotional/safety → empathy + DICGC      │
              │  • calculation/tax/procedural → routed KB  │
              └───────────────────────┬────────────────────┘
                                      │
                                      ▼
              ┌────────────────────────────────────────────┐
              │  Retrieval                                 │
              │  • Hybrid: BM25 + dense (BGE-M3) via RRF   │
              │  • Rerank: cross-encoder (graceful fallback)│
              │  • Rate-card injection from Postgres        │
              └───────────────────────┬────────────────────┘
                                      │
                                      ▼
              ┌────────────────────────────────────────────┐
              │  Confidence gate                           │
              │  Below threshold + < 2 sources → decline   │
              │  Otherwise → build grounded prompt         │
              └───────────────────────┬────────────────────┘
                                      │
                                      ▼
              ┌────────────────────────────────────────────┐
              │  Generation  (Ollama qwen2.5:7b, T=0.1)    │
              │  • LANGUAGE LOCK bookended top + bottom     │
              │  • Citations required                       │
              │  • Tools: deterministic maturity, glossary  │
              └───────────────────────┬────────────────────┘
                                      │
                                      ▼
              ┌────────────────────────────────────────────┐
              │  Post-processing                           │
              │  • DICGC notice when an SFB is mentioned    │
              │  • Compliance redactor (V1/V4/V7/V9)        │
              │  • Deterministic formula card (if math ran) │
              └───────────────────────┬────────────────────┘
                                      │
                                      ▼
              ┌────────────────────────────────────────────┐
              │  Cited, calm, vernacular answer            │
              └────────────────────────────────────────────┘
```

#### The two services

| Service | Role |
|---|---|
| **Next.js 15 (App Router)** · React 19 · Tailwind · Vercel AI SDK · Zustand | UI, streaming chat, compliance filter mirror, tool calls, persistence to Postgres. |
| **FastAPI · Python 3.12 / 3.13** | Document ingestion, chunking, embeddings (`BGE-M3`), FAISS per-session indices, hybrid retrieval, cross-encoder rerank, intent router, full RAG pipeline, evaluation runner. |

| Substrate | Choice | Why |
|---|---|---|
| LLM | Ollama `qwen2.5:7b` (local) | Strong Hindi quality, tool-calling support, zero per-token cost, works offline. |
| Embeddings | `BAAI/bge-m3` | Native multilingual including Devanagari sub-word tokenisation — one model for all 15 languages. |
| Reranker | `cross-encoder/ms-marco-MiniLM-L-6-v2` | Citation precision moves from ~61% → ~84%. Falls back gracefully on low-RAM machines. |
| Vector store | FAISS `IndexFlatIP` per session, on disk | Predictable, debuggable, no service to operate. |
| Database | Neon Serverless Postgres + Drizzle | Sessions, messages, sources, FD policies, behavioural-insight CSVs. |
| Auth | Clerk (toggleable; demo runs in shim) | Out of the way during evaluation, ready for production. |

> The full walkthrough of every stage — intent classes, gate threshold, language-lock framing, tool list, theme system — lives in [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md). The "why we picked / cut" trade-off log is in [`DECISIONS.md`](./DECISIONS.md).

---
<img width="1470" height="835" alt="image" src="https://github.com/user-attachments/assets/bc2c9df1-1e47-4fdf-9bcb-870c6c300487" />

<img width="1470" height="836" alt="image" src="https://github.com/user-attachments/assets/dff12880-690d-4b92-964b-061f1e7556d5" />

<img width="308" height="636" alt="image" src="https://github.com/user-attachments/assets/6fe28bb9-9034-4cd2-a943-7d4b59f0b3f4" />

<img width="297" height="465" alt="image" src="https://github.com/user-attachments/assets/74b38c25-8ca9-4545-985c-e979c1861361" />

## 6. What's Next

> The interesting question isn't "what could you add?" — it's "what would you fix *first*, and why?"

If the next month were available, in priority order:

1. **Vernacular reranking and Indic query rewriting.** The current cross-encoder is English-trained, which is the single largest reason the confidence gate had to be re-calibrated. A multilingual reranker (mMiniLM-L12-v2 or a fine-tune of `bge-m3` for cross-encoding) plus a tiny query-rewrite pass ("HDFC ka FD todna hai penalty kya" → "premature withdrawal penalty HDFC fixed deposit") would lift retrieval recall measurably for Hindi/Hinglish — the exact users this product is built for.

2. **OCR for scanned bank documents.** A large fraction of useful regulatory and bank PDFs are scanned, not text. Wiring a Tesseract / PaddleOCR step into ingestion before chunking would let users upload a brochure they got at a branch counter and get grounded answers — not a "we can't read this image" failure.

3. **Vernacular Bhashini-grade voice.** The Web Speech API has shallow coverage for Bhojpuri / Maithili / Odia. Replacing the TTS layer with Bhashini (or AI4Bharat IndicTTS) would unlock real voice-first use in the regions that need it most. The interface for this is already abstracted in `useTextToSpeech.ts`.

4. **Trust-UX iteration with senior users.** The redesigned, calm, Hindi-first UI is currently the result of one designer's judgement and one persona. The next correct step is to put it in front of 8–10 actual 50+ users, watch them, and instrument every confusing moment. Not a thing to guess from inside.

5. **Evaluation expansion (35 → 100+ cases, regression tracking).** The current eval covers 15 hand-picked, language-spread cases with an LLM judge and a deterministic fallback. The next step is a per-language pass-rate dashboard, regression diffs across commits, and adversarial cases — emotional manipulation, social engineering, mis-spellings — added monthly.

6. **Contradiction detection on retrieved chunks.** When two retrieved chunks quote different penalty rates, the user deserves to see *both*. This is a small NLI step in the post-retrieval stack. Currently a known gap.

7. **Index versioning and chunk provenance.** Each chunk should be tagged with `doc_version` and `ingested_at`. When a bank updates a brochure, the user should be able to see which version answered them — a basic but unsexy regulatory hygiene item that the current store doesn't have.

What is **not** on this list is also intentional: more agents, more model swapping, more "AI features." The growth direction is *trust depth*, not *capability surface*.

---

## 7. Closing

The Vernacular FD Advisor is a small system with an unfashionable premise: that for things as important as a family's savings, an AI assistant should speak less, cite more, and decline gracefully when it doesn't know. The interesting engineering work isn't in the retrieval pipeline — it's in everything we *didn't* let the model do.

It is a Hindi-first product, by default, on purpose. It exists for users for whom English-only banking apps are a daily friction. It runs locally so nothing about a user's money question ever has to leave the laptop they're sitting at. Its answers are grounded in regulator-issued documents, its math is deterministic, its language is calm.

If a 52-year-old retired clerk can ask his question in Hindi, hear it answered correctly with the original RBI line shown to him, and walk away understanding that his ₹5 lakh is insured — the system has done its job.

That is the whole point.

---
## Key Highlights

- 🌐 15 Indian languages
- 🏦 RBI & DICGC grounded answers
- 📄 Citation-based explainability
- 🎤 Voice interaction
- 🧮 Deterministic FD calculations
- 🔒 Compliance-aware responses
- 💻 Fully local inference with Ollama
  
## How to run it

```bash
# 0. Prerequisites: Python 3.12 or 3.13, Node 20+, Ollama, Neon (or Postgres),
#    optionally Clerk keys (the demo runs in shim mode without them).

# 1. LLM (one-time, ~5 GB)
ollama pull qwen2.5:7b

# 2. RAG backend (FastAPI · Python 3.12/3.13)
cd vidyakosh/rag_backend
python3 -m venv .venv && source .venv/bin/activate
pip install -U pip && pip install -r requirements.txt
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords')"
cp .env.example .env
python -m startup.preload_kb       # indexes RBI / DICGC / tax / bank PDFs

# 3. Next.js app
cd ..
cp .env.local.example .env.local   # add Clerk + Neon if you have them
npm install
npm run db:push
npm run seed

# 4. Boot all services
./demo_setup.sh                    # Ollama, FastAPI :8000, Next.js :3000

# 5. Try it
open http://localhost:3000
# Or run the eval suite:
cd rag_backend && python -m eval.run_eval
```

Pre-tested questions for the chat live in [`demo_queries.txt`](./demo_queries.txt). The architecture deep-dive lives in [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md). The trade-offs and cuts (and why) live in [`DECISIONS.md`](./DECISIONS.md).

---

## Repository at a glance

```
vidyakosh/
├── app/                         Next.js 15 routes (chat, compare, discover, onboarding)
├── components/                  UI (calm, Hindi-first, bilingual chrome)
│   ├── chat/                      bubble, citation badges, source drawer, language toggle
│   ├── compare/                   side-by-side workbench
│   ├── widgets/                   maturity calculator (deterministic)
│   └── ui/                        theme + text-size + Hi/En toggle
├── lib/
│   ├── prompts.ts                 per-language system prompts + LANGUAGE LOCK
│   ├── finance-math.ts            🔴 deterministic, no LLM
│   ├── tools.ts                   maturity / glossary / rate lookup tools
│   ├── glossary.ts                vernacular financial-term explanations
│   └── intent-router.ts           out-of-scope + empathy routing (TS mirror)
├── store/app-store.ts             single source of truth for language + state
├── rag_backend/
│   ├── ingestion/                 PDF / MD / TXT loaders, sentence-aware chunker
│   ├── embeddings/                BGE-M3 singleton (CPU / MPS aware)
│   ├── vectorstore/               FAISS per-session index
│   ├── retrieval/                 hybrid retriever, reranker, intent router
│   ├── generation/                vernacular prompts, compliance filter, LLM client
│   ├── pipeline/rag_pipeline.py   the one place that orchestrates a query
│   ├── analytics/                 transaction-CSV-backed behavioural insight
│   ├── eval/                      file-driven multilingual eval runner
│   └── knowledge_base/documents/  RBI, DICGC, tax, SEBI/KYC, bank brochures
├── PROJECT_OVERVIEW.md            full architectural walkthrough
├── DECISIONS.md                   what was built, what was cut, and why
├── demo_setup.sh                  one-command boot
└── demo_queries.txt               pre-tested copy-paste queries
```

---
## Demo Flow

1. Ask an FD question in Hindi
2. View citation-backed response
3. Open RBI source reference
4. Compare FD plans
5. Use voice interaction
6. View deterministic FD calculations
## License & notice
---
Educational use only. **The Vernacular FD Advisor is not financial advice.** Always confirm rates, rules, and protections directly with your bank or with the RBI before any decision. Sample transaction data used for the behavioural-insight chip is synthetic and modelled on public-forum patterns — never scraped.

> *आपकी भाषा में, आपके पैसे की बात — सीधे, सरल, और ज़िम्मेदार।*
> *Money information, in your own language — direct, simple, and responsible.*
