"""Preload Builder Pack regulatory refs + any bank brochures placed in the KB.

Usage:
    cd vidyakosh/rag_backend
    source .venv/bin/activate
    python -m startup.preload_kb

Indices land in ``knowledge_base/indices/<session_id>/``.
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
from pathlib import Path

if sys.version_info >= (3, 14):
    sys.stderr.write(
        "\n❌ preload_kb requires Python 3.12 or 3.13 (you have %d.%d).\n"
        "   conda create -n vfd-advisor python=3.12 -y && conda activate vfd-advisor\n\n"
        % (sys.version_info.major, sys.version_info.minor)
    )
    raise SystemExit(1)

# Make package importable when run as a script.
_HERE = Path(__file__).resolve().parent
_PROJECT = _HERE.parent
sys.path.insert(0, str(_PROJECT.parent))  # to import rag_backend.*
sys.path.insert(0, str(_PROJECT))

from dotenv import load_dotenv

load_dotenv(_PROJECT / ".env")

from rag_backend.pipeline.rag_pipeline import ingest


logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("preload")


# Manifest of files to index. Each entry: (session_id, relative_path, doc_title, source).
# Files that don't exist are skipped with a warning — drop bank brochures into the
# referenced paths to enable additional sessions.
MANIFEST: list[tuple[str, str, str, str]] = [
    # Builder Pack regulatory refs (always present)
    ("kb_rbi_master", "rbi_circulars/RBI_FD_DICGC_summary.md", "RBI Master Direction — FD & DICGC", "RBI"),
    ("kb_kyc",        "rbi_circulars/KYC_VKYC_norms.md",      "RBI KYC / Video-KYC Norms",          "RBI"),
    ("kb_sebi",       "rbi_circulars/SEBI_MF_AIF_SIF_summary.md", "SEBI MF/AIF/SIF Summary",        "SEBI"),
    ("kb_dpdpa",      "rbi_circulars/DPDPA_data_handling.md", "DPDPA — Data Handling",              "MeitY"),

    # Bank brochures — drop the PDFs at these paths to enable
    ("kb_suryoday", "bank_brochures/suryoday_fd_2024.pdf", "Suryoday SFB FD Brochure", "Suryoday SFB"),
    ("kb_ujjivan",  "bank_brochures/ujjivan_fd_2024.pdf",  "Ujjivan SFB FD Brochure",  "Ujjivan SFB"),
    ("kb_esaf",     "bank_brochures/esaf_fd_2024.pdf",     "ESAF SFB FD Brochure",     "ESAF SFB"),
    ("kb_sbi",      "bank_brochures/sbi_fd_2024.pdf",      "SBI FD Brochure",          "SBI"),
    ("kb_hdfc",     "bank_brochures/hdfc_fd_2024.pdf",     "HDFC Bank FD Brochure",    "HDFC Bank"),
    ("kb_icici",    "bank_brochures/icici_fd_2024.pdf",    "ICICI Bank FD Brochure",   "ICICI Bank"),
    ("kb_axis",     "bank_brochures/axis_fd_2024.pdf",     "Axis Bank FD Brochure",    "Axis Bank"),

    # DICGC + tax rules — drop the PDFs to enable
    ("kb_dicgc", "dicgc/dicgc_guidelines_2023.pdf",      "DICGC Guidelines",                "DICGC"),
    ("kb_tax",   "tax_rules/tds_fd_rules_2024.pdf",      "Income Tax — TDS on FD (§194A)",  "Income Tax Dept"),
]


async def main() -> int:
    docs_root = _PROJECT / "knowledge_base" / "documents"
    if not docs_root.exists():
        log.error("docs root missing: %s", docs_root)
        return 1

    log.info("Loading embedding model… (first run downloads BGE-M3, ~2.3GB)")
    # Trigger model load up-front so the first ingest doesn't time out.
    from rag_backend.embeddings.factory import get_embedder
    get_embedder()

    successes = 0
    skipped = 0
    failed = 0

    for session_id, relative, doc_title, source in MANIFEST:
        path = docs_root / relative
        if not path.exists():
            log.warning("⚠️  skip %s — file missing: %s", session_id, path)
            skipped += 1
            continue
        try:
            result = await ingest(
                session_id=session_id,
                file_path=path,
                metadata={"doc_title": doc_title, "source": source},
            )
            log.info(
                "✅ %s: %s chunks from %s pages (%s)",
                session_id,
                result["chunk_count"],
                result["page_count"],
                doc_title,
            )
            successes += 1
        except Exception as exc:  # noqa: BLE001
            log.exception("❌ %s failed: %s", session_id, exc)
            failed += 1

    log.info("Done — %d indexed · %d skipped · %d failed", successes, skipped, failed)
    return 0 if failed == 0 else 2


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
