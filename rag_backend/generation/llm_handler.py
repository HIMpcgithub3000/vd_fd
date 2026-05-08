"""Thin wrapper around Ollama's /api/chat endpoint."""

from __future__ import annotations

import logging
from typing import List, Optional

import httpx

from rag_backend.config.settings import get_settings


logger = logging.getLogger(__name__)


class OllamaError(RuntimeError):
    """Raised when the local Ollama server is unreachable or returns an error."""


async def generate(
    prompt: str,
    system: Optional[str] = None,
    max_tokens: int = 1000,
    temperature: float = 0.1,
    model: Optional[str] = None,
) -> str:
    """Send a single user-turn to Ollama and return the assistant text."""
    settings = get_settings()
    url = f"{settings.ollama_base_url.rstrip('/')}/api/chat"
    body = {
        "model": model or settings.ollama_model,
        "messages": _messages(prompt, system),
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        },
    }
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(60.0)) as client:
            resp = await client.post(url, json=body)
    except httpx.HTTPError as exc:
        raise OllamaError(f"Failed to reach Ollama at {url}: {exc}") from exc

    if resp.status_code != 200:
        raise OllamaError(f"Ollama returned {resp.status_code}: {resp.text[:300]}")

    payload = resp.json()
    message = payload.get("message") or {}
    content = message.get("content")
    if not content:
        # Some Ollama builds return `response` for non-chat routes; fall back.
        content = payload.get("response", "")
    return content.strip()


async def health() -> dict:
    """Quick liveness probe of the Ollama server."""
    settings = get_settings()
    url = f"{settings.ollama_base_url.rstrip('/')}/api/tags"
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
            resp = await client.get(url)
        if resp.status_code != 200:
            return {"reachable": False, "model_loaded": False}
        models = [m.get("name") or m.get("model") for m in resp.json().get("models", [])]
        loaded = any(settings.ollama_model in (name or "") for name in models)
        return {"reachable": True, "model_loaded": loaded, "models": models}
    except httpx.HTTPError as exc:
        logger.warning("Ollama unreachable: %s", exc)
        return {"reachable": False, "model_loaded": False}


def _messages(user_prompt: str, system: Optional[str]) -> List[dict]:
    msgs: List[dict] = []
    if system:
        msgs.append({"role": "system", "content": system})
    msgs.append({"role": "user", "content": user_prompt})
    return msgs
