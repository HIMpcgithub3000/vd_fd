"""Per-session FAISS index with persistence.

We use ``IndexFlatIP`` over normalised vectors so the inner-product score
equals the cosine similarity in [-1, 1]. For our scale (a few thousand
chunks), exhaustive search is fast enough and avoids the IVF parameter
tuning headache.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Optional

import faiss
import numpy as np

from rag_backend.config.settings import get_settings
from rag_backend.embeddings.factory import get_embedder


logger = logging.getLogger(__name__)


@dataclass
class StoredChunk:
    text: str
    page: int
    chunk_index: int
    doc_title: str
    metadata: dict

    def to_dict(self) -> dict:
        return {
            "text": self.text,
            "page": self.page,
            "chunk_index": self.chunk_index,
            "doc_title": self.doc_title,
            "metadata": self.metadata,
        }


class FAISSStore:
    """One FAISS index per ``session_id``."""

    def __init__(self, session_id: str) -> None:
        self.session_id = session_id
        self.settings = get_settings()
        self.dir = self.settings.indices_dir / session_id
        self.dir.mkdir(parents=True, exist_ok=True)
        self.index_path = self.dir / "index.faiss"
        self.chunks_path = self.dir / "chunks.json"
        self._index: Optional[faiss.Index] = None
        self._chunks: List[StoredChunk] = []
        self._load_if_exists()

    # ------------------------------------------------------------------
    # Persistence
    def _load_if_exists(self) -> None:
        if self.index_path.exists() and self.chunks_path.exists():
            try:
                self._index = faiss.read_index(str(self.index_path))
                with open(self.chunks_path, "r", encoding="utf-8") as fh:
                    raw = json.load(fh)
                self._chunks = [
                    StoredChunk(
                        text=row["text"],
                        page=row["page"],
                        chunk_index=row["chunk_index"],
                        doc_title=row["doc_title"],
                        metadata=row.get("metadata", {}),
                    )
                    for row in raw
                ]
                logger.info(
                    "[faiss] loaded %s chunks for session %s",
                    len(self._chunks),
                    self.session_id,
                )
            except Exception as exc:  # corrupt index — rebuild on next add
                logger.warning("[faiss] failed to load %s: %s", self.session_id, exc)
                self._index = None
                self._chunks = []

    def _save(self) -> None:
        if self._index is not None:
            faiss.write_index(self._index, str(self.index_path))
        with open(self.chunks_path, "w", encoding="utf-8") as fh:
            json.dump([c.to_dict() for c in self._chunks], fh, ensure_ascii=False, indent=0)

    # ------------------------------------------------------------------
    # Read API
    @property
    def chunk_count(self) -> int:
        return len(self._chunks)

    def exists(self) -> bool:
        return self.index_path.exists() and self.chunks_path.exists() and bool(self._chunks)

    @property
    def chunks(self) -> List[StoredChunk]:
        return self._chunks

    # ------------------------------------------------------------------
    # Write API
    def add(
        self,
        chunks: Iterable[dict],
        doc_title: str,
        extra_metadata: Optional[dict] = None,
    ) -> int:
        chunks = list(chunks)
        if not chunks:
            return 0

        embedder = get_embedder()
        texts = [c["text"] for c in chunks]
        embeddings = embedder.embed(texts)

        if self._index is None:
            dim = embeddings.shape[1]
            self._index = faiss.IndexFlatIP(dim)

        self._index.add(embeddings)
        for c in chunks:
            self._chunks.append(
                StoredChunk(
                    text=c["text"],
                    page=c["page"],
                    chunk_index=c["chunk_index"],
                    doc_title=doc_title,
                    metadata={"word_count": c.get("word_count"), **(extra_metadata or {})},
                )
            )
        self._save()
        return len(chunks)

    def search(self, query: str, top_k: int = 10) -> List[dict]:
        if self._index is None or not self._chunks:
            return []
        embedder = get_embedder()
        q = embedder.embed_query(query).astype("float32").reshape(1, -1)
        scores, indices = self._index.search(q, min(top_k, len(self._chunks)))
        out: List[dict] = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0:
                continue
            chunk = self._chunks[int(idx)]
            out.append(
                {
                    "session_id": self.session_id,
                    "score": float(score),
                    "page": chunk.page,
                    "chunk_index": chunk.chunk_index,
                    "doc_title": chunk.doc_title,
                    "text": chunk.text,
                    "metadata": chunk.metadata,
                }
            )
        return out


# ---------------------------------------------------------------------------
# Convenience: cache stores per session id so we don't reload from disk
# on every retrieval call.
_STORE_CACHE: dict[str, FAISSStore] = {}


def get_store(session_id: str) -> FAISSStore:
    cached = _STORE_CACHE.get(session_id)
    if cached is not None:
        return cached
    store = FAISSStore(session_id)
    _STORE_CACHE[session_id] = store
    return store


def list_indexed_sessions() -> List[str]:
    settings = get_settings()
    if not settings.indices_dir.exists():
        return []
    return sorted(p.name for p in settings.indices_dir.iterdir() if p.is_dir())
