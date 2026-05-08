"""Cross-encoder reranker. Falls back to RRF score on low-RAM machines."""

from __future__ import annotations

import logging
from threading import Lock
from typing import List, Optional

from rag_backend.config.settings import get_settings


logger = logging.getLogger(__name__)


class _RerankerSingleton:
    _instance: Optional["_RerankerSingleton"] = None
    _lock = Lock()

    def __init__(self) -> None:
        settings = get_settings()
        self.model_name = settings.reranker_model
        self.model = None
        try:
            from sentence_transformers import CrossEncoder

            logger.info("Loading reranker: %s", self.model_name)
            self.model = CrossEncoder(self.model_name)
        except Exception as exc:
            logger.warning(
                "[reranker] failed to load %s: %s — falling back to RRF only",
                self.model_name,
                exc,
            )
            self.model = None

    @classmethod
    def instance(cls) -> "_RerankerSingleton":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = _RerankerSingleton()
        return cls._instance


def cross_encoder_active() -> bool:
    """True when the cross-encoder model loaded (not RRF-only fallback)."""
    return _RerankerSingleton.instance().model is not None


def rerank(query: str, chunks: List[dict], top_k: int = 5) -> List[dict]:
    """Re-rank ``chunks`` (each with a ``text`` field) by cross-encoder score.

    On failure (model unloaded, OOM), this gracefully returns the chunks
    sorted by their existing RRF/dense score truncated to ``top_k``.
    """
    if not chunks:
        return []

    singleton = _RerankerSingleton.instance()
    model = singleton.model

    if model is None:
        # Already sorted upstream; just slice and add a normalised final score.
        out = []
        for c in chunks[:top_k]:
            base = c.get("rrf_score") or c.get("score") or 0.0
            out.append({**c, "final_score": float(base)})
        return out

    pairs = [(query, c.get("text") or "") for c in chunks]
    try:
        raw_scores = model.predict(pairs)
    except Exception as exc:
        logger.warning("[reranker] predict failed: %s — falling back", exc)
        return [{**c, "final_score": c.get("rrf_score") or c.get("score") or 0.0} for c in chunks[:top_k]]

    scored = []
    for chunk, raw in zip(chunks, raw_scores):
        # Normalise cross-encoder logit to [0, 1] using sigmoid for display.
        normalised = 1.0 / (1.0 + pow(2.71828, -float(raw)))
        scored.append({**chunk, "final_score": float(normalised)})

    scored.sort(key=lambda d: d["final_score"], reverse=True)
    return scored[:top_k]
