"""Embedding model singleton.

BGE-M3 is the preferred multilingual model. For low-RAM machines, override
``EMBEDDING_MODEL`` to ``sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2``.
"""

from __future__ import annotations

import logging
from threading import Lock
from typing import List, Optional

import numpy as np
from sentence_transformers import SentenceTransformer

from rag_backend.config.settings import get_settings


logger = logging.getLogger(__name__)


class EmbeddingFactory:
    _instance: Optional["EmbeddingFactory"] = None
    _lock: Lock = Lock()

    def __init__(self) -> None:
        settings = get_settings()
        self.model_name = settings.embedding_model
        logger.info("Loading embedding model: %s", self.model_name)
        self._model = SentenceTransformer(self.model_name)
        self._dim = self._model.get_sentence_embedding_dimension()

    @classmethod
    def instance(cls) -> "EmbeddingFactory":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = EmbeddingFactory()
        return cls._instance

    @property
    def dim(self) -> int:
        return int(self._dim)

    def embed(self, texts: List[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, self.dim), dtype="float32")
        embeddings = self._model.encode(
            texts,
            normalize_embeddings=True,
            show_progress_bar=False,
            convert_to_numpy=True,
        )
        return np.asarray(embeddings, dtype="float32")

    def embed_query(self, query: str) -> np.ndarray:
        return self.embed([query])[0]


def get_embedder() -> EmbeddingFactory:
    return EmbeddingFactory.instance()
