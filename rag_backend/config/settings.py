"""Centralised configuration loaded from environment variables."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # LLM
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:7b"

    # Embeddings & reranker
    embedding_model: str = "BAAI/bge-m3"
    reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"

    # Chunking
    chunk_size: int = 512
    chunk_overlap: int = 128

    # API auth
    rag_api_key: str = "vfd-advisor-internal-2024"

    # Paths (relative to repo root, resolved at startup)
    kb_indices_path: str = "./knowledge_base/indices"
    kb_docs_path: str = "./knowledge_base/documents"

    @property
    def indices_dir(self) -> Path:
        return Path(self.kb_indices_path).resolve()

    @property
    def docs_dir(self) -> Path:
        return Path(self.kb_docs_path).resolve()


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    settings = Settings()
    settings.indices_dir.mkdir(parents=True, exist_ok=True)
    settings.docs_dir.mkdir(parents=True, exist_ok=True)
    return settings
