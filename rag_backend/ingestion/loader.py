"""Load PDF / Markdown / TXT documents into a list of (page, text) records."""

from __future__ import annotations

import re
from pathlib import Path
from typing import List, Dict

from pypdf import PdfReader

# Strip page numbers and common boilerplate that PDFs include on every page.
_BOILERPLATE_PATTERNS = [
    re.compile(r"^\s*Page\s+\d+\s+of\s+\d+\s*$", re.IGNORECASE | re.MULTILINE),
    re.compile(r"^\s*\d{1,4}\s*$", re.MULTILINE),  # bare page number lines
    re.compile(r"\n{3,}"),  # collapse blank lines
]


def _clean(text: str) -> str:
    cleaned = text
    for pattern in _BOILERPLATE_PATTERNS[:-1]:
        cleaned = pattern.sub("", cleaned)
    cleaned = _BOILERPLATE_PATTERNS[-1].sub("\n\n", cleaned)
    return cleaned.strip()


def load_pdf(file_path: str | Path) -> List[Dict]:
    """Return ``[{"page": int, "text": str}, ...]`` for a PDF file."""
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(path)

    reader = PdfReader(str(path))
    pages: List[Dict] = []
    for idx, page in enumerate(reader.pages, start=1):
        try:
            raw = page.extract_text() or ""
        except Exception as exc:  # malformed page object
            raw = ""
            print(f"[loader] page {idx} extraction failed: {exc}")
        cleaned = _clean(raw)
        if cleaned:
            pages.append({"page": idx, "text": cleaned})
    return pages


def load_markdown(file_path: str | Path) -> List[Dict]:
    """Treat each ``##`` heading section as a virtual page for citation purposes."""
    text = Path(file_path).read_text(encoding="utf-8")

    # Split on H1/H2 headings, keep the heading line with its body.
    blocks = re.split(r"^(?=#{1,2}\s)", text, flags=re.MULTILINE)
    blocks = [b.strip() for b in blocks if b.strip()]

    if not blocks:
        return [{"page": 1, "text": text.strip()}]

    return [{"page": idx, "text": block} for idx, block in enumerate(blocks, start=1)]


def load_text(file_path: str | Path) -> List[Dict]:
    text = Path(file_path).read_text(encoding="utf-8")
    return [{"page": 1, "text": text.strip()}]


def load_document(file_path: str | Path) -> List[Dict]:
    """Dispatch on file extension."""
    suffix = Path(file_path).suffix.lower()
    if suffix == ".pdf":
        return load_pdf(file_path)
    if suffix in {".md", ".markdown"}:
        return load_markdown(file_path)
    if suffix in {".txt", ""}:
        return load_text(file_path)
    raise ValueError(f"Unsupported file type: {suffix}")
