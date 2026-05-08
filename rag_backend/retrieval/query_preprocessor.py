"""Query preprocessing: language detection, expansion, and intent classification.

Two layers of expansion run in order:

  1. **Phrase-level vernacular normalisation** — rural / idiomatic Hindi
     phrasings like "पैसा डूब जाएगा?" or "FD फूट गया" are mapped to canonical
     banking concepts ("DICGC deposit insurance safety", "premature withdrawal
     closure"). This is the difference between "user-vocabulary" and
     "regulator-vocabulary"; the documents are written in regulator-vocabulary.

  2. **Token-level synonym + transliteration expansion** — Devanagari ↔ Roman
     pairs, semi-rural spellings, and English banking jargon are appended so
     a Hinglish query like "byaj kitna milega?" hits Devanagari documents.

Both layers are conservative — they *append* tokens to the query, never
replace the original. Cross-encoder rerank handles the final relevance call.
"""

from __future__ import annotations

import re
from typing import List, Tuple

try:
    from langdetect import detect, LangDetectException
except ImportError:  # langdetect missing — degrade gracefully
    detect = None  # type: ignore
    LangDetectException = Exception  # type: ignore


# ---------------------------------------------------------------------------
# Layer 1 — Phrase-level idiom map. Multi-word user idioms → canonical
# banking concepts. Each phrase is checked as a substring (case-insensitive
# for Latin; literal for Devanagari).
# ---------------------------------------------------------------------------
VERNACULAR_PHRASES: list[Tuple[List[str], str]] = [
    # Safety / DICGC
    (
        [
            "पैसा डूब",
            "paisa doob",
            "paisa dub",
            "paise doob",
            "paise dub",
            "बैंक डूब",
            "bank doob",
            "bank dub",
            "bank fail",
            "bank band",
            "bank बंद",
        ],
        "DICGC deposit insurance safety bank failure 5 lakh cover",
    ),
    # Premature withdrawal
    (
        [
            "fd तोड़",
            "fd tod",
            "fd todna",
            "fd फोड़",
            "fd phod",
            "fd फूट",
            "fd phut",
            "fd phoot",
            "जल्दी निकाल",
            "jaldi nikal",
            "जल्दी तोड़",
            "समय से पहले",
            "samay se pehle",
            "kat jayega",
            "कट जा",
            "जल्दी पैसा",
            "early withdrawal",
            "premature break",
        ],
        "premature withdrawal penalty closure before maturity",
    ),
    # Tax / TDS
    (
        [
            "tax कट",
            "tax kat",
            "tax katega",
            "टैक्स कट",
            "टैक्स कटे",
            "tds katega",
            "tds कट",
            "form 15g",
            "फॉर्म 15g",
            "ब्याज पर tax",
            "byaj par tax",
        ],
        "TDS tax deducted at source 194A 40000 50000 senior threshold form 15G 15H",
    ),
    # Senior citizen
    (
        [
            "senior citizen",
            "बूढ़े",
            "बुजुर्ग",
            "वरिष्ठ",
            "papa ke liye",
            "papa के लिए",
            "अम्मा",
            "60 साल",
            "60 year",
            "रिटायर",
            "retire",
        ],
        "senior citizen 60 years extra rate 25 50 75 bps additional interest",
    ),
    # Interest / accrual
    (
        [
            "ब्याज रुक",
            "byaj ruk",
            "byaj nahi",
            "ब्याज नहीं",
            "interest band",
            "interest stop",
            "ब्याज मिलेगा",
            "byaj milega",
        ],
        "interest accrual rate quarterly compounding payout",
    ),
    # Maturity
    (
        [
            "kitna milega",
            "कितना मिलेगा",
            "kitna milta",
            "कितना मिलता",
            "मैच्योरिटी",
            "maturity amount",
            "perpekva",
            "परिपक्वता",
            "kitna byaj",
            "कितना ब्याज",
        ],
        "maturity amount payout interest earned compound calculation",
    ),
    # KYC / video KYC
    (
        [
            "kyc",
            "केवाईसी",
            "video kyc",
            "vkyc",
            "वीडियो kyc",
            "kyc kaise",
            "केवाईसी कैसे",
        ],
        "KYC video KYC PAN Aadhaar customer identification verification",
    ),
    # Tax saver / 80C
    (
        [
            "tax saver",
            "टैक्स सेवर",
            "80c",
            "80C",
            "5 साल lock",
            "lock in 5 साल",
            "5 year lock",
        ],
        "tax saver FD section 80C 5 year lock-in 1.5 lakh deduction",
    ),
    # Auto renewal
    (
        [
            "auto renewal",
            "ऑटो रिन्यू",
            "renew ho",
            "रिन्यू ह",
            "मैच्योरिटी पर renew",
            "auto renew",
        ],
        "FD auto renewal maturity rollover instructions",
    ),
    # Out of scope warm-redirect (handled by intent_router but expansion still helpful)
    (
        [
            "mutual fund",
            "म्यूचुअल फंड",
            "sip",
            "एसआईपी",
            "stock",
            "share",
            "शेयर",
            "nifty",
            "sensex",
            "सेंसेक्स",
            "elss",
        ],
        "fixed deposit FD only out of scope SEBI registered advisor",
    ),
    # Compare
    (
        [
            "vs",
            "compare",
            "तुलना",
            "tulna",
            "बेहतर",
            "behtar",
            "kaun sa",
            "कौन सा",
            "farak",
            "फर्क",
            "अंतर",
        ],
        "compare difference comparison policy",
    ),
]


# ---------------------------------------------------------------------------
# Layer 2 — Token-level synonym + transliteration map. Each canonical concept
# expands to all the ways users might write it. Far broader than v1.
# ---------------------------------------------------------------------------
SYNONYMS: dict[str, List[str]] = {
    "interest": [
        "interest",
        "rate",
        "byaj",
        "byaaz",
        "byaaj",
        "ब्याज",
        "दर",
        "rate of return",
        "return",
        "yield",
        "p.a.",
        "per annum",
    ],
    "fd": [
        "fd",
        "fixed deposit",
        "term deposit",
        "एफडी",
        "जमा",
        "fixed deposit account",
        "deposit",
    ],
    "premature": [
        "premature",
        "premature withdrawal",
        "तोड़",
        "तोड़ना",
        "tod",
        "todna",
        "tudna",
        "before maturity",
        "early break",
        "early closure",
        "फूटना",
        "phootna",
        "फोड़ना",
        "phodna",
    ],
    "penalty": [
        "penalty",
        "fine",
        "पेनल्टी",
        "जुर्माना",
        "charge",
        "deduction",
        "kat",
        "कट",
    ],
    "dicgc": [
        "dicgc",
        "deposit insurance",
        "जमा बीमा",
        "5 lakh",
        "5 लाख",
        "guarantee",
        "गारंटी",
        "deposit insurance and credit guarantee corporation",
        "insurance cover",
        "बीमा कवर",
    ],
    "tds": [
        "tds",
        "tax deducted",
        "tax",
        "टीडीएस",
        "कर",
        "withholding",
        "194a",
        "section 194a",
        "tax katega",
        "टैक्स कटे",
        "40000",
        "50000",
    ],
    "senior": [
        "senior",
        "senior citizen",
        "60 year",
        "60 साल",
        "60 साल का",
        "बुजुर्ग",
        "वरिष्ठ",
        "बूढ़े",
        "papa",
        "पापा",
        "अम्मा",
        "amma",
        "retire",
        "रिटायर",
    ],
    "sfb": [
        "sfb",
        "small finance bank",
        "स्मॉल फाइनेंस",
        "लघु वित्त",
        "लघु वित्त बैंक",
        "small bank",
        "सूर्योदय",
        "उज्जीवन",
        "ईसैफ",
        "इसाफ",
        "esaf",
        "ujjivan",
        "suryoday",
    ],
    "tax_saver": [
        "tax saver",
        "80c",
        "80 c",
        "5 year lock",
        "5 साल lock",
        "टैक्स सेवर",
        "lock in",
        "lock-in",
        "लॉक इन",
        "section 80c",
    ],
    "kyc": [
        "kyc",
        "know your customer",
        "केवाईसी",
        "vkyc",
        "video kyc",
        "वीडियो kyc",
        "pan",
        "aadhaar",
        "आधार",
        "पैन",
    ],
    "auto_renewal": [
        "auto renewal",
        "renew",
        "रिन्यू",
        "नवीनीकरण",
        "auto-renew",
        "rollover",
        "roll over",
    ],
    "form_15g": [
        "15g",
        "form 15g",
        "फॉर्म 15g",
        "फार्म 15g",
        "15-g",
        "fifteen g",
    ],
    "form_15h": [
        "15h",
        "form 15h",
        "फॉर्म 15h",
        "फार्म 15h",
        "15-h",
        "fifteen h",
    ],
    "maturity": [
        "maturity",
        "mature",
        "मैच्योरिटी",
        "परिपक्वता",
        "kitna milega",
        "kitna milta",
        "payout",
    ],
    "rbi": [
        "rbi",
        "reserve bank",
        "आरबीआई",
        "रिज़र्व बैंक",
        "रिजर्व बैंक",
        "रिजर्व",
    ],
    "safety": [
        "safe",
        "safety",
        "सुरक्षित",
        "सुरक्षा",
        "डूब",
        "doob",
        "dub",
        "fail",
        "बंद",
        "band",
    ],
    "compare": [
        "vs",
        "versus",
        "compare",
        "comparison",
        "तुलना",
        "tulna",
        "बेहतर",
        "behtar",
        "kaun sa",
        "कौन सा",
        "farak",
        "फर्क",
        "अंतर",
    ],
}


# Hindi-only patterns (used to nudge language detection on short queries).
DEVANAGARI = re.compile(r"[\u0900-\u097F]")
LATIN = re.compile(r"[A-Za-z]")


def detect_language(text: str) -> str:
    """Return one of: ``hi``, ``en``, ``mixed``. Always safe — never raises."""
    if not text or not text.strip():
        return "en"
    has_dev = bool(DEVANAGARI.search(text))
    if has_dev:
        # If any Devanagari is present, treat as Hindi or mixed.
        roman_chars = LATIN.findall(text)
        # Heuristic: ≥4 Latin chars *with* Devanagari = mixed (Hinglish).
        return "mixed" if len(roman_chars) >= 4 else "hi"
    if detect is None:
        return "en"
    try:
        guess = detect(text)
    except LangDetectException:
        return "en"
    if guess in {"hi", "mr", "ne"}:
        return "hi"
    if guess in {"en"}:
        return "en"
    return "mixed"


def _phrase_expansion(query: str) -> List[str]:
    """Apply Layer 1 — vernacular phrase recognition."""
    lower = query.lower()
    expansions: list[str] = []
    for triggers, canonical in VERNACULAR_PHRASES:
        for trig in triggers:
            # Latin phrases compare against lower-cased query; Devanagari
            # phrases compare against original.
            if re.search(r"[A-Za-z]", trig):
                hit = trig.lower() in lower
            else:
                hit = trig in query
            if hit:
                expansions.append(canonical)
                break  # don't double-count the same phrase
    return expansions


def expand_query(query: str) -> str:
    """Run both layers of expansion. Always appends — never replaces."""
    if not query.strip():
        return query

    additions: list[str] = []
    additions.extend(_phrase_expansion(query))

    lower = query.lower()
    for words in SYNONYMS.values():
        if any(word.lower() in lower or word in query for word in words):
            additions.extend(w for w in words if w.lower() not in lower)

    if not additions:
        return query

    seen: set[str] = set()
    deduped: list[str] = []
    for w in additions:
        key = w.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(w)
    return f"{query} {' '.join(deduped)}"


_INTENT_PATTERNS: list[Tuple[str, re.Pattern]] = [
    ("comparison", re.compile(r"\b(vs|versus|compare|farak|difference|बेहतर|कौन सा|kaun sa)\b", re.I)),
    ("calculation", re.compile(r"(kitna|कितना|कतना|kitne|maturity|interest earned|hoga|payout|net|मिलेगा)", re.I)),
    ("safety", re.compile(r"(safe|safety|सुरक्षित|डूब|fail|सुरक्षा|guarantee|बंद)", re.I)),
    ("policy_lookup", re.compile(r"(rate|ब्याज|byaj|premature|टीडीएस|tds|dicgc|बीमा|kyc|policy|rules|नियम)", re.I)),
]


def classify_intent(query: str) -> str:
    """Best-effort intent label. Defaults to ``policy_lookup``."""
    for label, pattern in _INTENT_PATTERNS:
        if pattern.search(query):
            return label
    return "policy_lookup"


def preprocess(query: str) -> dict:
    return {
        "original": query,
        "language": detect_language(query),
        "expanded": expand_query(query),
        "intent": classify_intent(query),
    }
