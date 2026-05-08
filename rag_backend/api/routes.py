"""FastAPI route definitions."""

from __future__ import annotations

import logging
import shutil
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile
from pydantic import BaseModel, Field

from rag_backend.config.settings import get_settings
from rag_backend.generation.llm_handler import health as ollama_health
from rag_backend.pipeline.rag_pipeline import (
    compare as compare_pipeline,
    ingest as ingest_pipeline,
    query as query_pipeline,
    retrieve_only,
)
from rag_backend.vectorstore.faiss_store import FAISSStore, get_store, list_indexed_sessions


logger = logging.getLogger(__name__)


async def require_api_key(x_api_key: Optional[str] = Header(default=None)) -> str:
    settings = get_settings()
    if x_api_key != settings.rag_api_key:
        raise HTTPException(status_code=401, detail="Invalid X-API-Key")
    return x_api_key


# ---------------------------------------------------------------------------
# Schemas
class RetrieveRequest(BaseModel):
    query: str
    session_ids: List[str]
    language: str = "hi"
    top_k: int = Field(default=5, ge=1, le=20)


class ChatRequest(BaseModel):
    query: str
    session_ids: List[str]
    language: str = "hi"
    top_k: int = Field(default=5, ge=1, le=20)
    bank_name: Optional[str] = None


class CompareRequest(BaseModel):
    query: str
    policy_session_ids: List[str]
    policy_names: List[str]
    language: str = "hi"
    top_k: int = Field(default=5, ge=1, le=20)
    # One rate-card "fact sheet" per policy (1-1 with policy_session_ids,
    # ``None`` if the policy is not in ``fd_policies``). Each fact is
    # converted to a synthetic [Source N] block and concatenated with the
    # FAISS retrieval BEFORE the confidence gate. This is what lets banks
    # without an indexed brochure (kb_axis, kb_hdfc, etc. — empty index
    # folders on disk today) still produce a grounded answer instead of
    # the "I could not find a reliable answer" decline.
    policy_facts: Optional[List[Optional[Dict[str, Any]]]] = None


router = APIRouter()


@router.get("/api/insights")
async def get_insights() -> dict:
    from rag_backend.analytics.insights import all_insights

    try:
        return all_insights()
    except Exception as exc:
        return {"key_insight": "Transaction data unavailable.", "error": str(exc)}


# ---------------------------------------------------------------------------
# Health (no auth)
@router.get("/api/health")
async def health() -> dict:
    info = await ollama_health()
    return {
        "status": "ok",
        "ollama": "reachable" if info["reachable"] else "unreachable",
        "model_loaded": info.get("model_loaded", False),
        "indexed_sessions": list_indexed_sessions(),
    }


# ---------------------------------------------------------------------------
# Ingestion
@router.post("/api/ingest", dependencies=[Depends(require_api_key)])
async def ingest_endpoint(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    bank_name: Optional[str] = Form(default=None),
    doc_title: Optional[str] = Form(default=None),
) -> dict:
    if not session_id.startswith("kb_"):
        raise HTTPException(status_code=400, detail="session_id must start with 'kb_'")

    tmp_dir = Path(tempfile.mkdtemp(prefix="vfd-advisor-ingest-"))
    try:
        target = tmp_dir / (file.filename or "upload.bin")
        with open(target, "wb") as fh:
            shutil.copyfileobj(file.file, fh)
        result = await ingest_pipeline(
            session_id=session_id,
            file_path=target,
            metadata={
                "doc_title": doc_title or Path(file.filename or session_id).stem,
                "bank_name": bank_name,
            },
        )
        return result
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


# ---------------------------------------------------------------------------
# Retrieval (used by Next.js /api/chat to build context BEFORE the LLM call)
@router.post("/api/retrieve", dependencies=[Depends(require_api_key)])
async def retrieve_endpoint(req: RetrieveRequest) -> dict:
    return await retrieve_only(
        session_ids=req.session_ids,
        question=req.query,
        language=req.language,
        top_k=req.top_k,
    )


# ---------------------------------------------------------------------------
# Full RAG chat (LLM generation done locally on this backend)
@router.post("/api/chat", dependencies=[Depends(require_api_key)])
async def chat_endpoint(req: ChatRequest) -> dict:
    try:
        result = await query_pipeline(
            session_ids=req.session_ids,
            question=req.query,
            language=req.language,
            top_k=req.top_k,
            bank_name=req.bank_name,
        )
    except Exception as exc:
        logger.exception("chat failed")
        raise HTTPException(status_code=502, detail=f"chat-failed: {exc}") from exc
    return result


# ---------------------------------------------------------------------------
# Parallel compare (the headline second demo moment)
@router.post("/api/compare", dependencies=[Depends(require_api_key)])
async def compare_endpoint(req: CompareRequest) -> dict:
    if len(req.policy_session_ids) != len(req.policy_names):
        raise HTTPException(status_code=400, detail="session_ids and names must be same length")
    if len(req.policy_session_ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 policies required")

    try:
        return await compare_pipeline(
            query_text=req.query,
            policy_session_ids=req.policy_session_ids,
            policy_names=req.policy_names,
            language=req.language,
            top_k=req.top_k,
            policy_facts=req.policy_facts,
        )
    except Exception as exc:
        logger.exception("compare failed")
        raise HTTPException(status_code=502, detail=f"compare-failed: {exc}") from exc


# ---------------------------------------------------------------------------
# Session info (used by the Next.js Knowledge Explorer)
@router.get("/api/session/{session_id}", dependencies=[Depends(require_api_key)])
async def session_info(session_id: str) -> dict:
    store = get_store(session_id)
    if not store.exists():
        raise HTTPException(status_code=404, detail="session-not-indexed")
    sample_titles = sorted({c.doc_title for c in store.chunks[:50]})
    return {
        "session_id": session_id,
        "chunk_count": store.chunk_count,
        "doc_titles": sample_titles,
    }


@router.get("/api/sessions", dependencies=[Depends(require_api_key)])
async def list_sessions() -> dict:
    sessions = []
    for sid in list_indexed_sessions():
        store = get_store(sid)
        sessions.append({"session_id": sid, "chunk_count": store.chunk_count})
    return {"sessions": sessions}
