"""Intent router — classifies queries and returns retrieval configuration."""

from __future__ import annotations

import re
from typing import Literal

Intent = Literal[
    "out_of_scope",
    "emotional_panic",
    "calculation",
    "tax_clarification",
    "procedural_help",
    "senior_citizen_special",
    "safety_doubt",
    "compare_rates",
    "product_definition",
    "regulatory_status",
    "complaint",
    "general_fd",
]

# First match wins — most specific first.
_PATTERNS: list[tuple[str, list[str]]] = [
    (
        "out_of_scope",
        [
            r"\bSIF\b",
            r"\bAIF\b",
            r"\bPMS\b",
            r"\bmutual\s*fund\b",
            r"\bMF\b",
            r"\bequity\b",
            r"\bstock\b",
            r"\bELSS\b",
            r"\bnifty\b",
            r"\bsensex\b",
            r"\bNFO\b",
            r"\bsmallcap\b",
            r"\blargecap\b",
            r"\bmidcap\b",
            r"\bETF\b",
            r"\bindex\s+fund\b",
            r"\bliquid\s+fund\b",
            r"\barbitrage\s+fund\b",
        ],
    ),
    (
        "emotional_panic",
        [
            r"\bbank\s+fail\b",
            r"\bdub\s+gaya\b",
            r"\bdub\s+jayega\b",
            r"\bdoob\b",
            r"\bfail\s+ho\b",
            r"\bpaisa\s+jaayega\b",
            r"\bnews\s+me\b",
            r"\bbankrupt\b",
            r"\bcollapse\b",
        ],
    ),
    (
        "calculation",
        [
            r"\bkitna\s+milega\b",
            r"\bkitna\s+banega\b",
            r"\bkitni\s+rashi\b",
            r"\bmaturity\s+amount\b",
            r"\bcalculate\b",
            r"\bhow\s+much.*get\b",
            r"\binterest\s+calcu\b",
        ],
    ),
    (
        "tax_clarification",
        [
            r"\bTDS\b",
            r"\b15G\b",
            r"\b15H\b",
            r"\bincome\s+tax\b",
            r"\bslab\b",
            r"\bITR\b",
            r"\b80C\b",
            r"\bdeduction\b",
            r"\btax\s+saver\b",
        ],
    ),
    (
        "procedural_help",
        [
            r"\bpremature\b",
            r"\btod\b",
            r"\btodni\b",
            r"\bbreak\s+FD\b",
            r"\bnikaal\b",
            r"\bwithdraw\b",
            r"\bclosure\b",
            r"\bbandh\s+karna\b",
            r"\bkaise\s+karu\b",
            r"\bprocess\b",
            r"\bkab\s+milega\b",
            r"\bpenalty\b",
        ],
    ),
    (
        "senior_citizen_special",
        [
            r"\bsenior\b",
            r"\bbuzurg\b",
            r"\b60\s+saal\b",
            r"\b65\s+saal\b",
            r"\bretire\b",
            r"\bpension\b",
            r"\bmonthly\s+income\b",
            r"\bpapa\b",
            r"\bmummy\b",
        ],
    ),
    (
        "safety_doubt",
        [
            r"\bsafe\b",
            r"\bsecure\b",
            r"\bsahi\s+hai\b",
            r"\bbharosa\b",
            r"\bDICGC\b",
            r"\binsured\b",
            r"\brisk\b",
            r"\bfraud\b",
            r"\bcheat\b",
        ],
    ),
    (
        "compare_rates",
        [
            r"\bsabse\s+zyada\b",
            r"\bbest\s+rate\b",
            r"\bhighest\s+rate\b",
            r"\bcompare\b",
            r"\bvs\b",
            r"\bversus\b",
            r"\bkonsa\s+bank\b",
            r"\bwhich\s+bank\b",
            r"\bcomparison\b",
        ],
    ),
    (
        "product_definition",
        [
            r"\bkya\s+hota\b",
            r"\bkya\s+hai\b",
            r"\bmatlab\b",
            r"\bsamjhao\b",
            r"\bexplain\b",
            r"\bwhat\s+is\b",
            r"\bdefinition\b",
            r"\bFD\s+kya\b",
        ],
    ),
    (
        "regulatory_status",
        [
            r"\bSEBI\s+registered\b",
            r"\bRBI\s+licence\b",
            r"\bapproved\s+by\b",
            r"\blegal\b",
            r"\bombudsman\b",
            r"\bgrievance\b",
        ],
    ),
    (
        "complaint",
        [
            r"\bVKYC\b",
            r"\bKYC\s+fail\b",
            r"\bkaam\s+nahi\b",
            r"\bstuck\b",
            r"\berror\b",
            r"\bsupport\b",
            r"\bhelpline\b",
            r"\bnahi\s+sun\s+raha\b",
        ],
    ),
]

_OUT_OF_SCOPE_MSG = {
    "hi": "मैं केवल Fixed Deposits, RBI नियमों, DICGC और FD से जुड़े TDS के बारे में जानकारी दे सकता हूँ। Mutual Funds, SIF, AIF, या equity investments के लिए कृपया SEBI-registered advisor से संपर्क करें।",
    "bho": "हम सिरिफ Fixed Deposit, RBI नियम, आ DICGC के बारे में जानकारी देत हईं। Mutual Fund या equity खातिर SEBI-registered advisor से मिलीं।",
    "mai": "हम मात्र Fixed Deposit, RBI नियम आ DICGC विषयमे जानकारी दैत छी। Mutual Fund / equity लेल SEBI-registered advisor सँ संपर्क करी।",
    "mr": "मी केवळ Fixed Deposits, RBI नियम, DICGC आणि FD-संबंधित TDS विषयी माहिती देऊ शकतो. Mutual Funds, SIF, AIF, किंवा equity साठी SEBI-नोंदणीकृत सल्लागाराचा संपर्क करा.",
    "bn": "আমি কেবল Fixed Deposits, RBI নিয়ম, DICGC এবং FD-সংক্রান্ত TDS সম্পর্কে তথ্য দিতে পারি। Mutual Funds বা equity-এর জন্য একজন SEBI-registered advisor-এর সঙ্গে যোগাযোগ করুন।",
    "as": "মই কেৱল Fixed Deposits, RBI নিয়ম, DICGC আৰু FD-সম্পৰ্কীয় TDS বিষয়ে তথ্য দিব পাৰোঁ। Mutual Funds বাবে SEBI-registered advisor-ৰ সৈতে যোগাযোগ কৰক।",
    "or": "ମୁଁ କେବଳ Fixed Deposits, RBI ନିୟମ, DICGC ଓ FD-ସମ୍ବନ୍ଧୀୟ TDS ବିଷୟରେ ସୂଚନା ଦେଇପାରେ। Mutual Funds, SIF, AIF, କିମ୍ବା equity ପାଇଁ ଜଣେ SEBI-ପଞ୍ଜୀକୃତ ଉପଦେଷ୍ଟା ସହିତ ଯୋଗାଯୋଗ କରନ୍ତୁ।",
    "gu": "હું ફક્ત Fixed Deposits, RBI નિયમો, DICGC અને FD-સંબંધિત TDS વિશે માહિતી આપી શકું છું. Mutual Funds અથવા equity માટે કૃપા કરીને SEBI-નોંધાયેલા સલાહકારનો સંપર્ક કરો.",
    "pa": "ਮੈਂ ਸਿਰਫ਼ Fixed Deposits, RBI ਨਿਯਮ, DICGC ਅਤੇ FD ਨਾਲ ਸਬੰਧਿਤ TDS ਬਾਰੇ ਜਾਣਕਾਰੀ ਦੇ ਸਕਦਾ ਹਾਂ। Mutual Funds ਜਾਂ equity ਲਈ SEBI-ਰਜਿਸਟਰਡ ਸਲਾਹਕਾਰ ਨਾਲ ਸੰਪਰਕ ਕਰੋ।",
    "ur": "میں صرف Fixed Deposits، RBI ضوابط، DICGC اور FD سے متعلق TDS کے بارے میں معلومات دے سکتا ہوں۔ Mutual Funds یا equity کے لیے کسی SEBI-رجسٹرڈ ایڈوائزر سے رابطہ کریں۔",
    "ta": "நான் Fixed Deposits, RBI விதிமுறைகள், DICGC மற்றும் FD தொடர்பான TDS குறித்த தகவல்களை மட்டுமே வழங்க முடியும். Mutual Funds, SIF, AIF, அல்லது equity முதலீடுகளுக்கு SEBI-பதிவுசெய்யப்பட்ட ஆலோசகரை அணுகவும்.",
    "te": "నేను Fixed Deposits, RBI నియమాలు, DICGC మరియు FD-సంబంధిత TDS గురించి మాత్రమే సమాచారం ఇవ్వగలను. Mutual Funds, SIF, AIF, లేదా equity కోసం SEBI-నమోదిత సలహాదారుని సంప్రదించండి.",
    "kn": "ನಾನು Fixed Deposits, RBI ನಿಯಮಗಳು, DICGC ಮತ್ತು FD-ಸಂಬಂಧಿತ TDS ಕುರಿತು ಮಾತ್ರ ಮಾಹಿತಿಯನ್ನು ನೀಡಬಲ್ಲೆ. Mutual Funds, SIF, AIF, ಅಥವಾ equity ಗಾಗಿ SEBI-ನೋಂದಾಯಿತ ಸಲಹೆಗಾರರನ್ನು ಸಂಪರ್ಕಿಸಿ.",
    "ml": "എനിക്ക് Fixed Deposits, RBI നിയമങ്ങൾ, DICGC, FD-സംബന്ധിയായ TDS എന്നിവയെക്കുറിച്ച് മാത്രമേ വിവരം നൽകാൻ കഴിയൂ. Mutual Funds, SIF, AIF, അല്ലെങ്കിൽ equity-യ്ക്കായി SEBI-രജിസ്റ്റേർഡ് ഉപദേശകനെ സമീപിക്കുക.",
    "en": "I handle Fixed Deposit, RBI regulations, and DICGC queries only. For Mutual Funds, SIF, AIF, or equity investments please consult a SEBI-registered advisor.",
}

_EMPATHY_PREFIX = {
    "hi": "आपकी चिंता समझ में आती है। ",
    "bho": "रउआ के चिंता हमरा समझ में आइल। ",
    "mai": "अहाँक चिंता बुझाइत अछि। ",
    "mr": "तुमची चिंता मला समजते. ",
    "bn": "আপনার উদ্বেগ আমি বুঝতে পারছি। ",
    "as": "আপোনাৰ চিন্তা মই বুজি পাইছোঁ। ",
    "or": "ଆପଣଙ୍କ ଚିନ୍ତା ମୁଁ ବୁଝିପାରୁଛି। ",
    "gu": "તમારી ચિંતા હું સમજી શકું છું. ",
    "pa": "ਤੁਹਾਡੀ ਚਿੰਤਾ ਮੈਂ ਸਮਝ ਸਕਦਾ ਹਾਂ। ",
    "ur": "میں آپ کی پریشانی سمجھ سکتا ہوں۔ ",
    "ta": "உங்கள் கவலை எனக்குப் புரிகிறது. ",
    "te": "మీ ఆందోళన నాకు అర్థమవుతోంది. ",
    "kn": "ನಿಮ್ಮ ಆತಂಕ ನನಗೆ ಅರ್ಥವಾಗಿದೆ. ",
    "ml": "നിങ്ങളുടെ ആശങ്ക എനിക്ക് മനസ്സിലാകുന്നു. ",
    "en": "I understand your concern. ",
}


def classify(query: str) -> Intent:
    for intent, patterns in _PATTERNS:
        for p in patterns:
            if re.search(p, query, re.IGNORECASE):
                return intent  # type: ignore[return-value]
    return "general_fd"


def retrieval_config(intent: Intent, all_sessions: list[str]) -> dict:
    """Return routing config: skip_retrieval, sessions, top_k, prepend_empathy, out_of_scope_msg."""
    if intent == "out_of_scope":
        return {
            "skip_retrieval": True,
            "sessions": [],
            "top_k": 0,
            "prepend_empathy": False,
            "out_of_scope_msg": _OUT_OF_SCOPE_MSG,
        }

    priority_map: dict[str, list[str]] = {
        "emotional_panic": ["kb_dicgc", "kb_rbi_master"],
        "calculation": ["kb_rbi_master"],
        "tax_clarification": ["kb_rbi_master", "kb_tax"],
        "procedural_help": ["kb_rbi_master", "kb_dicgc"],
        "senior_citizen_special": ["kb_rbi_master", "kb_dicgc"],
        "safety_doubt": ["kb_dicgc", "kb_rbi_master"],
        "regulatory_status": ["kb_kyc", "kb_rbi_master"],
        "complaint": ["kb_kyc"],
    }

    priority = priority_map.get(intent)
    if priority:
        sessions = [s for s in priority if s in all_sessions]
        if not sessions:
            sessions = list(all_sessions)
    else:
        sessions = list(all_sessions)

    top_k = 5 if intent in ("calculation", "product_definition") else 8

    return {
        "skip_retrieval": False,
        "sessions": sessions,
        "top_k": top_k,
        "prepend_empathy": intent in ("emotional_panic", "safety_doubt"),
        "out_of_scope_msg": None,
    }


def get_empathy_prefix(language: str) -> str:
    return _EMPATHY_PREFIX.get(language, _EMPATHY_PREFIX["en"])
