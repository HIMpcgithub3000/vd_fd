"""Vernacular FD Advisor — programmatic compliance check (Builder Pack Template 5).

Called after DICGC post-processing, before returning an answer from the RAG pipeline.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ComplianceResult:
    verdict: str  # "PASS" | "FAIL"
    violations: list[str] = field(default_factory=list)
    suggested_fix: Optional[str] = None


_RULES: list[tuple[str, re.Pattern[str], str]] = [
    (
        "V1_BEST_BANK",
        re.compile(
            r"\b(best|sabse\s+achha|sabse\s+better|recommended|top\s+choice|best\s+option)\b",
            re.I,
        ),
        "Names a bank/product as 'best' or 'recommended'",
    ),
    (
        "V4_GUARANTEED",
        re.compile(
            r"\b(guaranteed|100\s*%\s*safe|no\s+risk|bilkul\s+safe|pura\s+safe|poori\s+tarah\s+safe|completely\s+safe)\b",
            re.I,
        ),
        "Uses guaranteed-return or 100%-safe language",
    ),
    (
        "V7_PRESSURE",
        re.compile(
            r"\b(limited\s+time|abhi\s+karein|sirf\s+aaj|act\s+now|only\s+today|jaldi\s+karein)\b",
            re.I,
        ),
        "Uses urgency / pressure language",
    ),
    (
        "V9_PROFANITY",
        re.compile(
            "|".join(
                [
                    # Devanagari abuse tokens (and common spelling variants)
                    r"हरामज़ाद[ेाीो]",
                    r"हरामजाद[ेाीो]",
                    r"हराम[ीि]",
                    r"कमीन[ेाी]",
                    r"गांडू",
                    r"गाण्डू",
                    r"मादरचोद",
                    r"बहनचोद",
                    r"भेनचोद",
                    r"भोसड़?ीके",
                    r"भोसड़?ी",
                    r"चूतिय[ाेो]",
                    r"रंडी",
                    r"साला",
                    r"साली",
                    # Transliterated and English equivalents
                    r"\bharamzaad[ae]\b",
                    r"\bharamzad[ae]\b",
                    r"\bharami\b",
                    r"\bkamine\b",
                    r"\bgandu\b",
                    r"\bmadarchod\b",
                    r"\bbehenchod\b",
                    r"\bbhenchod\b",
                    r"\bbsdk\b",
                    r"\bbhosdike\b",
                    r"\bchutiya[ah]?\b",
                    r"\brandi\b",
                    r"\bsaala\b",
                    r"\bf+u+c+k+\b",
                    r"\bshit\b",
                    r"\basshole\b",
                    r"\bbastard\b",
                ]
            ),
            re.IGNORECASE,
        ),
        "Contains profanity / abusive language",
    ),
]

_DISCLAIMER = {
    "hi": "\n\n⚠️ नोट: यह जानकारी केवल शैक्षिक उद्देश्य के लिए है। निवेश से पहले अपने बैंक से सीधे संपर्क करें।",
    "bho": "\n\n⚠️ नोट: ई जानकारी सिरिफ पढ़े-लिखे खातिर बा। पैसा लगावे से पहिले अपने बैंक से पूछीं।",
    "mai": "\n\n⚠️ नोट: ई जानकारी शैक्षिक उद्देश्य लेल अछि। बैंकसँ सीधे पुष्टि करी।",
    "mr": "\n\n⚠️ टीप: ही माहिती फक्त शैक्षणिक उद्देशासाठी आहे. गुंतवणुकीपूर्वी आपल्या बँकेशी संपर्क साधा.",
    "bn": "\n\n⚠️ দ্রষ্টব্য: এই তথ্য কেবলমাত্র শিক্ষাগত উদ্দেশ্যে। বিনিয়োগের আগে আপনার ব্যাংকের সঙ্গে সরাসরি যোগাযোগ করুন।",
    "as": "\n\n⚠️ মন্তব্য: এই তথ্য কেৱল শৈক্ষিক উদ্দেশ্যৰ বাবে। বিনিয়োগৰ আগতে আপোনাৰ বেংকৰ সৈতে যোগাযোগ কৰক।",
    "or": "\n\n⚠️ ଟିପ୍ପଣୀ: ଏହି ତଥ୍ୟ କେବଳ ଶିକ୍ଷାଗତ ଉଦ୍ଦେଶ୍ୟ ପାଇଁ। ବିନିଯୋଗ ପୂର୍ବରୁ ଆପଣଙ୍କ ବ୍ୟାଙ୍କ ସହିତ ଯୋଗାଯୋଗ କରନ୍ତୁ।",
    "gu": "\n\n⚠️ નોંધ: આ માહિતી ફક્ત શૈક્ષણિક હેતુ માટે છે. રોકાણ પહેલાં તમારી બેંકનો સંપર્ક કરો.",
    "pa": "\n\n⚠️ ਨੋਟ: ਇਹ ਜਾਣਕਾਰੀ ਸਿਰਫ਼ ਵਿੱਦਿਅਕ ਉਦੇਸ਼ ਲਈ ਹੈ। ਨਿਵੇਸ਼ ਤੋਂ ਪਹਿਲਾਂ ਆਪਣੇ ਬੈਂਕ ਨਾਲ ਸੰਪਰਕ ਕਰੋ।",
    "ur": "\n\n⚠️ نوٹ: یہ معلومات صرف تعلیمی مقصد کے لیے ہیں۔ سرمایہ کاری سے پہلے اپنے بینک سے رابطہ کریں۔",
    "ta": "\n\n⚠️ குறிப்பு: இந்தத் தகவல் கல்வி நோக்கிற்கு மட்டுமே. முதலீட்டிற்கு முன் உங்கள் வங்கியைத் தொடர்புகொள்ளவும்.",
    "te": "\n\n⚠️ గమనిక: ఈ సమాచారం విద్యా ప్రయోజనం కోసం మాత్రమే. పెట్టుబడికి ముందు మీ బ్యాంక్‌ను సంప్రదించండి.",
    "kn": "\n\n⚠️ ಸೂಚನೆ: ಈ ಮಾಹಿತಿಯು ಶೈಕ್ಷಣಿಕ ಉದ್ದೇಶಕ್ಕಾಗಿ ಮಾತ್ರ. ಹೂಡಿಕೆಗೆ ಮೊದಲು ನಿಮ್ಮ ಬ್ಯಾಂಕನ್ನು ಸಂಪರ್ಕಿಸಿ.",
    "ml": "\n\n⚠️ കുറിപ്പ്: ഈ വിവരം വിദ്യാഭ്യാസ ഉദ്ദേശ്യത്തിന് മാത്രം. നിക്ഷേപത്തിന് മുമ്പ് നിങ്ങളുടെ ബാങ്കിനെ സമീപിക്കുക.",
    "en": "\n\n⚠️ Note: This is for educational purposes only. Please confirm with your bank before investing.",
}


def check(response_text: str, language: str = "hi", source_count: int = 0) -> ComplianceResult:
    del source_count  # reserved for future V2 (unverified rate) rules
    violations: list[str] = []
    for code, pattern, desc in _RULES:
        if pattern.search(response_text):
            violations.append(f"{code}: {desc}")
    if violations:
        return ComplianceResult(
            verdict="FAIL",
            violations=violations,
            suggested_fix=_DISCLAIMER.get(language, _DISCLAIMER["en"]),
        )
    return ComplianceResult(verdict="PASS")


def apply(response_text: str, language: str = "hi", source_count: int = 0) -> str:
    """Return possibly amended response. On FAIL, redact matched phrases, append disclaimer, log."""
    result = check(response_text, language, source_count)
    if result.verdict == "FAIL":
        print(f"[COMPLIANCE FAIL] lang={language} violations={result.violations}", flush=True)
        redacted = response_text
        for _code, pattern, _desc in _RULES:
            redacted = pattern.sub("", redacted)
        # Clean up dangling punctuation/whitespace left by redaction.
        redacted = re.sub(r"^[\s,;:।!?\.\-]+", "", redacted)
        redacted = re.sub(r"[ \t]*([,;:।])\s*\1", r"\1", redacted)
        redacted = re.sub(r"\s+([,;:।!?\.])", r"\1", redacted)
        redacted = re.sub(r"\s{2,}", " ", redacted).strip()
        return redacted + _DISCLAIMER.get(language, _DISCLAIMER["en"])
    return response_text
