"""End-to-end RAG orchestration: ingest, retrieve, generate, compare."""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from rag_backend.ingestion.loader import load_document
from rag_backend.chunking.engine import chunk_document
from rag_backend.vectorstore.faiss_store import FAISSStore, get_store
from rag_backend.retrieval.hybrid_retriever import retrieve as hybrid_retrieve
from rag_backend.retrieval.reranker import rerank, cross_encoder_active
from rag_backend.retrieval.intent_router import (
    classify as classify_intent,
    retrieval_config,
    get_empathy_prefix,
)
from rag_backend.generation.vernacular_prompts import (
    build_context_blocks,
    get_prompt,
    add_dicgc_if_needed,
)
from rag_backend.generation.llm_handler import generate, OllamaError
from rag_backend.generation.compliance_filter import apply as compliance_apply
from rag_backend.config.settings import get_settings


logger = logging.getLogger(__name__)

CONFIDENCE_GATE_CE = 0.20
CONFIDENCE_GATE_DENSE = 0.18
MIN_SUPPORTING_SOURCES = 2

# Sentinel session id used by the Compare workbench for banks that have no
# indexed brochure on disk (e.g. ``kb_axis`` is an empty index folder today).
# The pipeline filters this id out before calling FAISS so retrieval simply
# returns 0 candidates from the FAISS path; a synthetic rate-card source
# (built from ``policy_facts``) carries the answer for these banks.
NO_INDEX_SENTINEL = "__rate_card_only__"


def _format_rate(v: Any) -> str:
    """Render a numeric/string rate as ``8.60``-style."""
    if v is None:
        return "?"
    try:
        return f"{float(v):.2f}"
    except (TypeError, ValueError):
        return str(v)


def _synthetic_rate_card_chunk(fact: Dict[str, Any], index_hint: int = 1) -> Dict[str, Any]:
    """Convert a seeded ``fd_policies`` row into a chunk dict that can flow
    through the rest of the pipeline (rerank → context-block builder →
    LLM grounding) as if it had come from FAISS.

    Mirrors the chat-side ``buildRateCardBlocks()`` injection so a bank
    without an indexed brochure still gets a grounded, factual answer.
    """
    bank = fact.get("bank_name", "Unknown bank")
    bank_type = fact.get("bank_type", "")
    rate = _format_rate(fact.get("rate_regular"))
    senior = _format_rate(fact.get("rate_senior"))
    min_dep = fact.get("min_deposit") or "—"
    penalty = _format_rate(fact.get("premature_penalty"))
    dicgc = "Yes" if fact.get("dicgc_covered") else "No"
    rbi_lic = "Yes" if fact.get("rbi_licensed") else "No"
    tax_saver = "Yes" if fact.get("tax_saver_available") else "No"
    notes = (fact.get("notes") or "").strip()

    body_lines = [
        f"Bank: {bank} ({bank_type})",
        f"Regular FD rate: {rate}% p.a.",
        f"Senior-citizen FD rate: {senior}% p.a.",
        f"Minimum deposit: ₹{min_dep}",
        f"Premature-withdrawal penalty: {penalty}% (typical band)",
        f"DICGC ₹5 lakh deposit insurance: {dicgc}",
        f"RBI-licensed: {rbi_lic}",
        f"Tax-saver FD (5y, §80C): {tax_saver}",
    ]
    if notes:
        body_lines.append(f"Note: {notes}")

    text = "\n".join(body_lines)

    # Use ``final_score=0.95`` so this synthetic block is kept by the
    # reranker and the confidence gate never trips because of it.
    return {
        "session_id": "rate_card_db",
        "doc_title": f"{bank} — current rate card",
        "page": 1,
        "chunk_index": 0,
        "text": text,
        "metadata": {"source_kind": "rate_card_db", "bank_name": bank},
        "score": 0.95,
        "dense_score": 0.95,
        "rrf_score": 0.95,
        "final_score": 0.95,
        "_synthetic": True,
        "_synthetic_hint": index_hint,
    }

_NO_INFO_MSG = {
    "hi": "मुझे इस प्रश्न का उत्तर उपलब्ध दस्तावेज़ों में नहीं मिला। कृपया अपने बैंक से सीधे पूछें।",
    "bho": "हमके इ सवाल के जवाब मौजूद कागज़ में नहीं मिलल। सीधे बैंक से पूछीं।",
    "mai": "एहि प्रश्नक उत्तर उपलब्ध दस्तावेज़मे नहि भेटल। बैंकसँ सीधे पुष्टि करी।",
    "mr": "या प्रश्नाचे विश्वसनीय उत्तर उपलब्ध कागदपत्रांत मला सापडले नाही. कृपया आपल्या बँकेशी थेट संपर्क साधा.",
    "bn": "এই প্রশ্নের নির্ভরযোগ্য উত্তর উপলব্ধ নথিগুলিতে আমি খুঁজে পাইনি। অনুগ্রহ করে সরাসরি আপনার ব্যাংকের সঙ্গে যোগাযোগ করুন।",
    "as": "এই প্ৰশ্নৰ নিৰ্ভৰযোগ্য উত্তৰ উপলব্ধ নথি-পত্ৰত মই বিচাৰি পোৱা নাছিলোঁ। অনুগ্ৰহ কৰি পোনপটীয়াকৈ আপোনাৰ বেংকৰ সৈতে যোগাযোগ কৰক।",
    "or": "ଏହି ପ୍ରଶ୍ନର ଭରସାଯୋଗ୍ୟ ଉତ୍ତର ଉପଲବ୍ଧ ଡକ୍ୟୁମେଣ୍ଟରେ ମୁଁ ପାଇଲି ନାହିଁ। ଦୟାକରି ସିଧାସଳଖ ଆପଣଙ୍କ ବ୍ୟାଙ୍କ ସହିତ ଯୋଗାଯୋଗ କରନ୍ତୁ।",
    "gu": "આ પ્રશ્નનો વિશ્વાસપાત્ર જવાબ ઉપલબ્ધ દસ્તાવેજોમાં મને મળ્યો નથી. કૃપા કરીને સીધા તમારી બેંકનો સંપર્ક કરો.",
    "pa": "ਇਸ ਸਵਾਲ ਦਾ ਭਰੋਸੇਯੋਗ ਜਵਾਬ ਉਪਲਬਧ ਦਸਤਾਵੇਜ਼ਾਂ ਵਿੱਚ ਨਹੀਂ ਮਿਲਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਸਿੱਧੇ ਆਪਣੇ ਬੈਂਕ ਨਾਲ ਸੰਪਰਕ ਕਰੋ।",
    "ur": "دستیاب دستاویزات میں مجھے اس سوال کا قابلِ اعتماد جواب نہیں ملا۔ براہ کرم براہِ راست اپنے بینک سے رابطہ کریں۔",
    "ta": "கிடைக்கின்ற ஆவணங்களில் இந்தக் கேள்விக்கான நம்பகமான பதில் எனக்குக் கிடைக்கவில்லை. தயவுசெய்து நேரடியாக உங்கள் வங்கியைத் தொடர்புகொள்ளவும்.",
    "te": "అందుబాటులో ఉన్న పత్రాలలో ఈ ప్రశ్నకు నమ్మదగిన సమాధానం నాకు దొరకలేదు. దయచేసి నేరుగా మీ బ్యాంక్‌ను సంప్రదించండి.",
    "kn": "ಈ ಪ್ರಶ್ನೆಗೆ ವಿಶ್ವಾಸಾರ್ಹ ಉತ್ತರ ಲಭ್ಯವಿರುವ ದಾಖಲೆಗಳಲ್ಲಿ ನನಗೆ ಸಿಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ನೇರವಾಗಿ ನಿಮ್ಮ ಬ್ಯಾಂಕನ್ನು ಸಂಪರ್ಕಿಸಿ.",
    "ml": "ലഭ്യമായ രേഖകളിൽ ഈ ചോദ്യത്തിന്‌ വിശ്വസനീയമായ ഉത്തരം എനിക്ക് കണ്ടെത്താനായില്ല. ദയവായി നേരിട്ട് നിങ്ങളുടെ ബാങ്കിനെ സമീപിക്കുക.",
    "en": "I could not find a reliable answer in the available documents. Please contact your bank directly.",
}


async def ingest(
    session_id: str,
    file_path: str | Path,
    metadata: Optional[dict] = None,
) -> dict:
    """Load → chunk → embed → store."""
    pages = load_document(file_path)
    settings = get_settings()
    chunks = chunk_document(
        pages,
        chunk_size=settings.chunk_size,
        overlap=settings.chunk_overlap,
    )
    store = FAISSStore(session_id)
    doc_title = (metadata or {}).get("doc_title") or Path(file_path).stem
    added = store.add(chunks, doc_title=doc_title, extra_metadata=metadata or {})
    return {
        "session_id": session_id,
        "chunk_count": store.chunk_count,
        "page_count": len(pages),
        "added": added,
        "doc_title": doc_title,
    }


async def retrieve_only(
    session_ids: Iterable[str],
    question: str,
    language: str = "hi",
    top_k: int = 5,
) -> dict:
    sids = [sid for sid in session_ids if sid]
    candidates = hybrid_retrieve(sids, question, top_k=20)
    ce_active = cross_encoder_active()
    if not candidates:
        return {
            "context_blocks": "",
            "sources": [],
            "meta": {
                "chunks_searched": 0,
                "top_score": 0.0,
                "retrieval_path": "hybrid+rerank" if ce_active else "hybrid+rrf",
                "sessions_queried": sids,
                "cross_encoder_active": ce_active,
                "reason": "no-candidates",
            },
        }
    reranked = rerank(question, candidates, top_k=top_k)
    context_blocks, sources = build_context_blocks(reranked, language=language)
    top_score = max((float(s.get("score") or 0.0) for s in sources), default=0.0)
    return {
        "context_blocks": context_blocks,
        "sources": sources,
        "meta": {
            "chunks_searched": len(candidates),
            "chunks_returned": len(sources),
            "top_score": round(top_score, 3),
            "retrieval_path": "hybrid+rerank" if ce_active else "hybrid+rrf",
            "sessions_queried": sids,
            "cross_encoder_active": ce_active,
        },
    }


async def query(
    session_ids: Iterable[str],
    question: str,
    language: str = "hi",
    top_k: int = 5,
    bank_name: Optional[str] = None,
    skip_intent_router: bool = False,
    synthetic_chunks: Optional[List[Dict[str, Any]]] = None,
) -> dict:
    """Run the full RAG pipeline for a single question.

    ``synthetic_chunks`` is an optional list of pre-built chunk dicts (in
    the same shape ``hybrid_retriever.retrieve`` returns) that get merged
    with the FAISS results **before** the confidence gate. Used by the
    Compare workbench to inject a rate-card source for banks that have no
    indexed brochure — see :func:`_synthetic_rate_card_chunk`.
    """
    # Filter out the sentinel id used by Compare for "no FAISS, only
    # synthetic rate-card" policies. The synthetic chunk takes its place.
    all_ids = [
        sid for sid in session_ids if sid and sid != NO_INDEX_SENTINEL
    ]
    synth = list(synthetic_chunks or [])

    if skip_intent_router:
        intent = "general_fd"
        active_sessions = all_ids
        effective_top_k = top_k
        prepend_empathy = False
    else:
        intent = classify_intent(question)
        cfg = retrieval_config(intent, all_ids)
        if cfg["skip_retrieval"]:
            msg = cfg["out_of_scope_msg"] or {}
            return {
                "answer": msg.get(language, msg.get("en", "")),
                "sources": [],
                "context_blocks": "",
                "intent": intent,
                "gated": False,
            }
        active_sessions = cfg["sessions"]
        effective_top_k = int(cfg["top_k"])
        prepend_empathy = bool(cfg["prepend_empathy"])

    if not question.strip():
        return {
            "answer": "",
            "sources": [],
            "context_blocks": "",
            "intent": intent,
            "gated": False,
        }

    # FAISS retrieval — may legitimately return [] for a bank that has no
    # indexed brochure. We still continue if synthetic chunks were
    # provided, since they carry the answer.
    if active_sessions:
        candidates = hybrid_retrieve(active_sessions, question, top_k=20)
    else:
        candidates = []

    if not candidates and not synth:
        return {
            "answer": _NO_INFO_MSG.get(language, _NO_INFO_MSG["en"]),
            "sources": [],
            "context_blocks": "",
            "intent": intent,
            "gated": True,
        }

    reranked = rerank(question, candidates, top_k=effective_top_k) if candidates else []

    # Prepend synthetic rate-card chunks. They already carry final_score=0.95
    # and bypass the confidence gate by being present and high-scoring. We
    # cap the merged length to ``effective_top_k`` so the prompt stays small.
    if synth:
        merged = synth + reranked
        reranked = merged[: max(effective_top_k, len(synth))]

    if reranked:
        best = float(reranked[0].get("final_score") or 0.0)
        enough_sources = len(reranked) >= MIN_SUPPORTING_SOURCES
        has_synthetic = any(c.get("_synthetic") for c in reranked)
        ctx, src = build_context_blocks(reranked, language=language)
        # Skip the gate entirely when we have at least one synthetic
        # rate-card source — that source is regulator-grade trustworthy
        # (it's the bank's seeded rate-card row from Postgres).
        if not has_synthetic:
            if cross_encoder_active():
                if best < CONFIDENCE_GATE_CE and not enough_sources:
                    return {
                        "answer": _NO_INFO_MSG.get(language, _NO_INFO_MSG["en"]),
                        "sources": src,
                        "context_blocks": ctx,
                        "intent": intent,
                        "gated": True,
                    }
            else:
                best_dense = max(
                    float(c.get("dense_score") or c.get("score") or 0.0) for c in reranked
                )
                if best_dense < CONFIDENCE_GATE_DENSE and not enough_sources:
                    return {
                        "answer": _NO_INFO_MSG.get(language, _NO_INFO_MSG["en"]),
                        "sources": src,
                        "context_blocks": ctx,
                        "intent": intent,
                        "gated": True,
                    }

    context_blocks, sources = build_context_blocks(reranked, language=language)
    system_prompt = get_prompt(language, context_blocks)
    try:
        raw = await generate(
            prompt=question,
            system=system_prompt,
            max_tokens=900,
            temperature=0.1,
        )
    except OllamaError as exc:
        logger.error("Ollama generation failed: %s", exc)
        raise

    answer = raw
    if prepend_empathy:
        answer = get_empathy_prefix(language) + answer
    answer = add_dicgc_if_needed(answer, bank_name, language)
    answer = compliance_apply(answer, language=language, source_count=len(sources))
    return {
        "answer": answer,
        "sources": sources,
        "context_blocks": context_blocks,
        "intent": intent,
        "gated": False,
    }


async def compare(
    query_text: str,
    policy_session_ids: List[str],
    policy_names: List[str],
    language: str = "hi",
    top_k: int = 5,
    policy_facts: Optional[List[Optional[Dict[str, Any]]]] = None,
) -> dict:
    """Run RAG queries for each policy in parallel + a final summary pass.

    ``policy_facts`` (1-1 with ``policy_session_ids``) carries each bank's
    seeded rate-card row from Postgres. When present, the row is converted
    to a synthetic ``[Source N]`` block and prepended to the bank's
    retrieval results. This lets banks without an indexed brochure still
    produce a grounded answer rather than the "I could not find a reliable
    answer" decline.
    """
    if len(policy_session_ids) != len(policy_names):
        raise ValueError("session_ids and names must align")
    if policy_facts is not None and len(policy_facts) != len(policy_session_ids):
        raise ValueError("policy_facts must align with policy_session_ids")

    tasks = []
    for idx, (sid, name) in enumerate(zip(policy_session_ids, policy_names)):
        fact = policy_facts[idx] if policy_facts else None
        synth = (
            [_synthetic_rate_card_chunk(fact, index_hint=idx + 1)]
            if isinstance(fact, dict) and fact.get("bank_name")
            else None
        )
        tasks.append(
            query(
                session_ids=[sid],
                question=query_text,
                language=language,
                top_k=top_k,
                bank_name=name,
                skip_intent_router=True,
                synthetic_chunks=synth,
            )
        )
    results = await asyncio.gather(*tasks, return_exceptions=True)

    per_policy = []
    valid_pairs: list[tuple[str, str]] = []
    for sid, name, res in zip(policy_session_ids, policy_names, results):
        if isinstance(res, Exception):
            logger.error("[compare] %s failed: %s", name, res)
            per_policy.append(
                {
                    "policyName": sid,
                    "bankName": name,
                    "answer": f"⚠️ Could not retrieve answer for {name}: {res}",
                    "sources": [],
                }
            )
            continue
        per_policy.append(
            {
                "policyName": sid,
                "bankName": name,
                "answer": res["answer"],
                "sources": res["sources"],
            }
        )
        valid_pairs.append((name, res["answer"]))

    if len(valid_pairs) < 2:
        summary = "तुलना के लिए पर्याप्त डेटा नहीं मिला।"
    else:
        try:
            summary = await _generate_summary(query_text, valid_pairs, language=language)
        except OllamaError as exc:
            logger.error("[compare] summary generation failed: %s", exc)
            summary = "AI summary unavailable — please review the per-bank answers above."

    return {"perPolicyAnswers": per_policy, "comparisonSummary": summary}


async def _generate_summary(
    query_text: str,
    bank_answers: List[tuple[str, str]],
    language: str,
) -> str:
    sys_prompt = (
        "You are summarising a side-by-side FD comparison for an Indian retail user. "
        "Write a 3-sentence neutral summary. Highlight ONLY the differences that appear in the answers below. "
        "Never recommend or call any bank 'best'. Do not invent figures. "
        "Cite each bank by name. Match the user's language: "
        f"{language}."
    )
    user_block = (
        f"USER QUESTION:\n\"{query_text}\"\n\n"
        + "\n\n".join(f"--- {name} ---\n{ans}" for name, ans in bank_answers)
        + "\n\nWrite the 3-sentence summary now. Match language code: "
        + language
        + "."
    )
    return await generate(prompt=user_block, system=sys_prompt, max_tokens=400, temperature=0.2)
