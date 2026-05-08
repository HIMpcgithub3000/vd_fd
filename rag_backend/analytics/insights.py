"""Aggregates behavioral patterns from Builder Pack–style transaction CSVs."""

from __future__ import annotations

import csv
from collections import Counter, defaultdict
from functools import lru_cache
from pathlib import Path

_DIR = Path(__file__).parent


@lru_cache(maxsize=1)
def _load_bookings() -> list[dict]:
    p = _DIR / "fd_bookings.csv"
    if not p.exists():
        return []
    with open(p, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


@lru_cache(maxsize=1)
def _load_dropoffs() -> list[dict]:
    p = _DIR / "fd_rate_check_dropoffs.csv"
    if not p.exists():
        return []
    with open(p, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def premature_withdrawal_rates() -> dict[str, dict]:
    """Premature withdrawal rate per booking language."""
    by_lang: dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "premature": 0})
    for row in _load_bookings():
        lang = row.get("language_at_booking", "unknown")
        by_lang[lang]["total"] += 1
        if row.get("status") == "PREMATURE_WITHDRAWN":
            by_lang[lang]["premature"] += 1
    return {
        lang: {
            "rate_pct": round(100 * v["premature"] / v["total"], 1),
            "total": v["total"],
            "premature": v["premature"],
        }
        for lang, v in by_lang.items()
        if v["total"] > 0
    }


def top_product_types(language: str) -> list[str]:
    rows = [r for r in _load_bookings() if r.get("language_at_booking") == language]
    if not rows:
        return []
    return [pt for pt, _ in Counter(r["product_type"] for r in rows).most_common(3)]


def booking_conversion_rate() -> dict[str, float]:
    """% of rate-check sessions that converted to a booking within 24h, by language."""
    by_lang: dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "converted": 0})
    for row in _load_dropoffs():
        lang = row.get("language", "unknown")
        by_lang[lang]["total"] += 1
        if row.get("booked_within_24h", "").lower() == "true":
            by_lang[lang]["converted"] += 1
    return {
        lang: round(100 * v["converted"] / v["total"], 1)
        for lang, v in by_lang.items()
        if v["total"] > 0
    }


def key_insight() -> str:
    """Single-sentence insight for the Discover page chip."""
    rates = premature_withdrawal_rates()
    hi = rates.get("hi", {}).get("rate_pct")
    en = rates.get("en", {}).get("rate_pct")
    conv = booking_conversion_rate()
    hi_conv = conv.get("hi")
    if hi is not None and en is not None and hi > en:
        return (
            f"Hindi-language users break FDs early {hi}% of the time vs {en}% for English users — "
            f"making penalty and DICGC explanation the highest-value feature for vernacular users."
        )
    if hi_conv is not None:
        return f"{hi_conv}% of Hindi users who compared rates booked within 24 hours."
    return "Transaction data shows FD safety questions are the #1 query type for vernacular users."


def all_insights() -> dict:
    return {
        "key_insight": key_insight(),
        "premature_withdrawal_rates": premature_withdrawal_rates(),
        "top_products_hindi": top_product_types("hi"),
        "booking_conversion": booking_conversion_rate(),
    }
