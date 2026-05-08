"""Vernacular FD Advisor — RAG backend entrypoint."""

from __future__ import annotations

import logging
import os
import sys

# Python 3.14+ breaks pydantic-core source builds (PyO3 / typing internals).
# Force a clear message before any FastAPI/Pydantic import.
if sys.version_info >= (3, 14):
    sys.stderr.write(
        "\n❌ Vernacular FD Advisor RAG backend does not support Python %d.%d yet.\n"
        "   Use Python 3.12 or 3.13, e.g.:\n"
        "     conda create -n vfd-advisor python=3.12 -y && conda activate vfd-advisor\n"
        "   or (Homebrew):  brew install python@3.12\n"
        "                   /opt/homebrew/opt/python@3.12/bin/python3.12 -m venv .venv\n\n"
        % (sys.version_info.major, sys.version_info.minor)
    )
    raise SystemExit(1)

from dotenv import load_dotenv

# Load .env before any settings imports.
load_dotenv()

# Make ``rag_backend`` importable when uvicorn is started from inside the
# ``rag_backend`` directory.
_HERE = os.path.dirname(os.path.abspath(__file__))
_PARENT = os.path.dirname(_HERE)
if _PARENT not in sys.path:
    sys.path.insert(0, _PARENT)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from rag_backend.api.routes import router


logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


app = FastAPI(
    title="Vernacular FD Advisor — RAG Backend",
    version="1.0.0",
    description="Multilingual FD / RBI / DICGC retrieval-augmented assistant.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://*.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

app.include_router(router)


@app.get("/")
async def root() -> dict:
    return {"name": "Vernacular FD Advisor RAG", "docs": "/docs", "health": "/api/health"}
