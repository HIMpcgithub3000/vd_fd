"""Sentence-aware chunker. Targets ~512 tokens with 128 overlap by default.

Includes a near-duplicate detector that drops chunks whose shingle-Jaccard
similarity to an already-kept chunk exceeds ``DEDUP_JACCARD_GATE``. Brochures
and circulars often reproduce the same DICGC / TDS / KYC paragraph verbatim
on multiple pages — without dedup the retriever spends top-k slots on the
same content."""

from __future__ import annotations

import logging
import re
from typing import List, Dict

logger = logging.getLogger(__name__)

_SENTENCE_SPLIT = re.compile(
    r"(?<=[\.\?\!।॥])\s+(?=[\u0900-\u097Fa-zA-Z])",
)

# Words above this Jaccard threshold are treated as duplicates. Tuned on the
# Builder Pack corpus where the DICGC paragraph repeats at ~0.92 Jaccard.
DEDUP_JACCARD_GATE = 0.85
DEDUP_SHINGLE_SIZE = 5

_NON_WORD = re.compile(
    r"[^A-Za-z0-9\u0900-\u097f\u0980-\u09ff\u0a00-\u0a7f\u0a80-\u0aff"
    r"\u0b00-\u0b7f\u0b80-\u0bff\u0c00-\u0c7f\u0c80-\u0cff\u0d00-\u0d7f\u0600-\u06ff]+"
)


def _sentences(text: str) -> List[str]:
    # Hindi punctuation: '।' and '॥' (devanagari danda + double danda).
    pieces = _SENTENCE_SPLIT.split(text)
    return [p.strip() for p in pieces if p.strip()]


def _shingles(text: str, n: int = DEDUP_SHINGLE_SIZE) -> set[str]:
    tokens = [t for t in _NON_WORD.split(text.lower()) if t]
    if len(tokens) < n:
        return set()
    return {" ".join(tokens[i : i + n]) for i in range(len(tokens) - n + 1)}


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return inter / union if union else 0.0


def _dedup_near_duplicates(
    chunks: List[Dict], threshold: float = DEDUP_JACCARD_GATE
) -> List[Dict]:
    """Drop chunks whose shingle-Jaccard ≥ threshold to a kept chunk.

    O(n²) is fine for hundreds of chunks per session. We also keep the
    *longer* of two near-duplicates (more context to rerank against).
    """
    if not chunks:
        return chunks

    kept: List[Dict] = []
    kept_shingles: List[set[str]] = []
    dropped = 0
    for chunk in chunks:
        shingles = _shingles(chunk["text"])
        is_dup = False
        for i, ks in enumerate(kept_shingles):
            if _jaccard(shingles, ks) >= threshold:
                # If the new chunk is materially longer, replace the existing one.
                if chunk["word_count"] > kept[i]["word_count"] * 1.10:
                    kept[i] = chunk
                    kept_shingles[i] = shingles
                else:
                    dropped += 1
                is_dup = True
                break
        if not is_dup:
            kept.append(chunk)
            kept_shingles.append(shingles)

    if dropped:
        logger.info(
            "[chunker] dedup dropped %d / %d near-duplicate chunks (threshold=%.2f)",
            dropped,
            len(chunks),
            threshold,
        )
    # Re-index to keep chunk_index dense.
    for i, c in enumerate(kept):
        c["chunk_index"] = i
    return kept


def chunk_document(
    pages: List[Dict],
    strategy: str = "sentence",
    chunk_size: int = 512,
    overlap: int = 128,
    min_words: int = 20,
    dedup: bool = True,
) -> List[Dict]:
    """Produce chunks ``[{text, page, chunk_index, word_count}, ...]``.

    The size & overlap are measured in *words* — not BPE tokens — for speed
    and simplicity. 512 words is empirically a good fit for BGE-M3 (max 8192
    tokens) and for the qwen2.5 7B context window.

    Set ``dedup=False`` to skip the near-duplicate pass (used by tests).
    """
    if strategy != "sentence":
        raise NotImplementedError("Only 'sentence' strategy is implemented")

    chunks: List[Dict] = []
    chunk_index = 0
    for page in pages:
        sentences = _sentences(page["text"])
        if not sentences:
            continue

        current: List[str] = []
        current_word_count = 0
        for sentence in sentences:
            words = sentence.split()
            if not words:
                continue
            if current_word_count + len(words) > chunk_size and current:
                chunk_text = " ".join(current).strip()
                if len(chunk_text.split()) >= min_words:
                    chunks.append(
                        {
                            "text": chunk_text,
                            "page": page["page"],
                            "chunk_index": chunk_index,
                            "word_count": len(chunk_text.split()),
                        }
                    )
                    chunk_index += 1
                # Start next chunk with overlap from end of previous
                current = _take_tail_words(current, overlap)
                current_word_count = sum(len(s.split()) for s in current)
            current.append(sentence)
            current_word_count += len(words)

        if current:
            chunk_text = " ".join(current).strip()
            if len(chunk_text.split()) >= min_words:
                chunks.append(
                    {
                        "text": chunk_text,
                        "page": page["page"],
                        "chunk_index": chunk_index,
                        "word_count": len(chunk_text.split()),
                    }
                )
                chunk_index += 1

    if dedup:
        chunks = _dedup_near_duplicates(chunks)
    return chunks


def _take_tail_words(sentences: List[str], target_words: int) -> List[str]:
    """Return the suffix of ``sentences`` whose total word count is ~target_words."""
    out: List[str] = []
    total = 0
    for sentence in reversed(sentences):
        wc = len(sentence.split())
        if total + wc > target_words and out:
            break
        out.append(sentence)
        total += wc
    return list(reversed(out))
