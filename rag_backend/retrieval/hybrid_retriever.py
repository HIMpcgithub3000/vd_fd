"""Hybrid retrieval: dense FAISS + sparse BM25 + Reciprocal Rank Fusion + MMR."""

from __future__ import annotations

import logging
import re
from typing import Iterable, List, Optional

import numpy as np
from rank_bm25 import BM25Okapi

from rag_backend.retrieval.query_preprocessor import expand_query
from rag_backend.vectorstore.faiss_store import get_store


logger = logging.getLogger(__name__)


def _tokenize(text: str) -> List[str]:
    """Tokeniser that works for English + Hindi (whitespace + Devanagari aware)."""
    return [t for t in re.split(r"[\s\.,;:!?\(\)\[\]\"'/]+", text.lower()) if t]


def _rrf_merge(rankings: List[List[dict]], k: int = 60) -> List[dict]:
    """Reciprocal Rank Fusion across multiple ranked lists.

    score(d) = sum_i 1 / (k + rank_i(d))

    Items are deduplicated by ``(session_id, chunk_index)``.
    """
    fused: dict[tuple, dict] = {}
    for ranking in rankings:
        for rank, doc in enumerate(ranking, start=1):
            key = (doc["session_id"], doc["chunk_index"])
            entry = fused.get(key)
            if entry is None:
                entry = dict(doc)
                entry["rrf_score"] = 0.0
                entry["dense_score"] = doc.get("dense_score") or doc.get("score") or 0.0
                fused[key] = entry
            entry["rrf_score"] += 1.0 / (k + rank)
            # Keep the highest dense score we've seen for this chunk.
            if "score" in doc and doc["score"] > entry.get("dense_score", 0.0):
                entry["dense_score"] = doc["score"]
    merged = list(fused.values())
    merged.sort(key=lambda d: d["rrf_score"], reverse=True)
    return merged


def _mmr_diversify(
    candidates: List[dict],
    lambda_: float = 0.7,
    top_k: int = 5,
) -> List[dict]:
    """Reduce same-page repetition via simple lexical-overlap MMR."""
    if len(candidates) <= top_k:
        return candidates
    selected: List[dict] = []
    pool = list(candidates)

    def page_set(doc: dict) -> set[str]:
        return {f"{doc['session_id']}:{doc['page']}"}

    def text_tokens(doc: dict) -> set[str]:
        return set(_tokenize(doc.get("text") or ""))

    while pool and len(selected) < top_k:
        if not selected:
            chosen = pool.pop(0)
            selected.append(chosen)
            continue

        # Scoring: relevance − redundancy penalty.
        best_score = -1e9
        best_idx = 0
        for i, cand in enumerate(pool):
            relevance = cand.get("rrf_score", 0.0)
            cand_tokens = text_tokens(cand)
            cand_pages = page_set(cand)

            redundancy = 0.0
            for chosen in selected:
                token_overlap = len(cand_tokens & text_tokens(chosen)) / max(
                    1, len(cand_tokens | text_tokens(chosen))
                )
                page_overlap = 1.0 if cand_pages & page_set(chosen) else 0.0
                redundancy = max(redundancy, 0.5 * token_overlap + 0.5 * page_overlap)

            score = lambda_ * relevance - (1 - lambda_) * redundancy
            if score > best_score:
                best_score = score
                best_idx = i
        selected.append(pool.pop(best_idx))

    return selected


def retrieve(
    session_ids: Iterable[str],
    query: str,
    top_k: int = 5,
    dense_top_k: int = 20,
) -> List[dict]:
    """Return ranked list of chunks across all session indices.

    Each item: ``{session_id, score, page, chunk_index, doc_title, text, metadata}``.
    """
    session_ids = [sid for sid in session_ids if sid]
    if not session_ids or not query.strip():
        return []

    expanded = expand_query(query)

    dense_results: List[dict] = []
    for sid in session_ids:
        store = get_store(sid)
        if not store.exists():
            logger.warning("[hybrid] session %s not indexed; skipping", sid)
            continue
        for hit in store.search(query, top_k=dense_top_k):
            hit["dense_score"] = hit.get("score", 0.0)
            dense_results.append(hit)

    if not dense_results:
        return []

    # Sparse — build BM25 over the union of returned chunks. Cheap because
    # we already filtered down via dense. (For larger corpora this would be
    # built per-session and merged.)
    corpus_tokens = [_tokenize(d["text"]) for d in dense_results]
    bm25 = BM25Okapi(corpus_tokens)
    scores = bm25.get_scores(_tokenize(expanded))

    sparse_ranked = sorted(
        ({**d, "score": float(s)} for d, s in zip(dense_results, scores)),
        key=lambda d: d["score"],
        reverse=True,
    )
    dense_ranked = sorted(dense_results, key=lambda d: d["score"], reverse=True)

    merged = _rrf_merge([dense_ranked, sparse_ranked])
    diversified = _mmr_diversify(merged, top_k=top_k)
    return diversified
