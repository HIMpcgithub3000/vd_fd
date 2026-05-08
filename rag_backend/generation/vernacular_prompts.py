"""Per-language system prompts. Mirrors lib/prompts.ts on the Next.js side."""

from __future__ import annotations

from typing import Iterable, List

LANGUAGES = (
    "hi",
    "bho",
    "mai",
    "mr",
    "bn",
    "as",
    "or",
    "gu",
    "pa",
    "ur",
    "ta",
    "te",
    "kn",
    "ml",
    "en",
)


SOURCE_LABEL = {
    "hi": "स्रोत",
    "bho": "स्रोत",
    "mai": "स्रोत",
    "mr": "स्रोत",
    "bn": "উৎস",
    "as": "উৎস",
    "or": "ଉତ୍ସ",
    "gu": "સ્રોત",
    "pa": "ਸਰੋਤ",
    "ur": "ماخذ",
    "ta": "ஆதாரம்",
    "te": "మూలం",
    "kn": "ಮೂಲ",
    "ml": "ഉറവിടം",
    "en": "Source",
}


NOT_FOUND_LINE = {
    "hi": "मुझे यह जानकारी दिए गए दस्तावेज़ों में नहीं मिली। कृपया बैंक की हेल्पलाइन या RBI से पुष्टि करें।",
    "bho": "हमरा ई जानकारी दस्तावेज़ में नइखे मिलल। कृपया बैंक हेल्पलाइन से पूछीं।",
    "mai": "हमरा ई जानकारी दस्तावेज में नहि भेटल। कृपया बैंक सं पुष्टि करू।",
    "mr": "मला ही माहिती दिलेल्या कागदपत्रांत मिळाली नाही. कृपया बँक हेल्पलाइन किंवा RBI शी संपर्क साधा.",
    "bn": "প্রদত্ত নথিগুলিতে আমি এই তথ্য খুঁজে পাইনি। অনুগ্রহ করে ব্যাংক হেল্পলাইন বা RBI-এর সাথে যোগাযোগ করুন।",
    "as": "প্ৰদান কৰা নথি-পত্ৰত মই এই তথ্য বিচাৰি পোৱা নাছিলোঁ। অনুগ্ৰহ কৰি বেংক হেল্পলাইন বা RBI-ৰ সৈতে যোগাযোগ কৰক।",
    "or": "ଦିଆଯାଇଥିବା ଡକ୍ୟୁମେଣ୍ଟରେ ମୁଁ ଏହି ସୂଚନା ପାଇଲି ନାହିଁ। ଦୟାକରି ବ୍ୟାଙ୍କ ହେଲ୍ପଲାଇନ୍ କିମ୍ବା RBI ସହିତ ଯୋଗାଯୋଗ କରନ୍ତୁ।",
    "gu": "આપેલા દસ્તાવેજોમાં મને આ માહિતી મળી નથી. કૃપા કરીને બેન્ક હેલ્પલાઈન અથવા RBI નો સંપર્ક કરો.",
    "pa": "ਦਿੱਤੇ ਦਸਤਾਵੇਜ਼ਾਂ ਵਿੱਚ ਮੈਨੂੰ ਇਹ ਜਾਣਕਾਰੀ ਨਹੀਂ ਮਿਲੀ। ਕਿਰਪਾ ਕਰਕੇ ਬੈਂਕ ਹੈਲਪਲਾਈਨ ਜਾਂ RBI ਨਾਲ ਸੰਪਰਕ ਕਰੋ।",
    "ur": "میں نے فراہم کردہ دستاویزات میں یہ معلومات نہیں پائی۔ براہ کرم اپنے بینک کی ہیلپ لائن یا RBI سے رابطہ کریں۔",
    "ta": "வழங்கப்பட்ட ஆவணங்களில் இந்தத் தகவலை என்னால் கண்டுபிடிக்க முடியவில்லை. தயவுசெய்து வங்கி ஹெல்ப்லைனை அல்லது RBI-ஐத் தொடர்புகொள்ளவும்.",
    "te": "ఇచ్చిన పత్రాలలో ఈ సమాచారం నాకు దొరకలేదు. దయచేసి బ్యాంక్ హెల్ప్‌లైన్ లేదా RBI‌ని సంప్రదించండి.",
    "kn": "ಒದಗಿಸಿದ ದಾಖಲೆಗಳಲ್ಲಿ ಈ ಮಾಹಿತಿ ನನಗೆ ಸಿಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಬ್ಯಾಂಕ್ ಸಹಾಯವಾಣಿ ಅಥವಾ RBI ಅನ್ನು ಸಂಪರ್ಕಿಸಿ.",
    "ml": "നൽകിയ രേഖകളിൽ ഈ വിവരം എനിക്ക് കണ്ടെത്താൻ കഴിഞ്ഞില്ല. ദയവായി ബാങ്ക് ഹെൽപ്പ്‌ലൈനിനെയോ RBI-യെയോ ബന്ധപ്പെടുക.",
    "en": "I could not find this information in the provided documents. Please verify with the bank helpline or RBI.",
}


def build_context_blocks(chunks: Iterable[dict], language: str = "hi") -> tuple[str, List[dict]]:
    """Return ``(formatted_blocks, source_dicts)`` ready for the prompt.

    Each source dict now also carries the dense and rerank scores so the UI
    can show a retrieval-explainability strip ("how did this chunk score?").
    """
    label = SOURCE_LABEL.get(language, SOURCE_LABEL["en"])
    blocks: List[str] = []
    sources: List[dict] = []
    for idx, chunk in enumerate(chunks, start=1):
        score = float(chunk.get("final_score") or chunk.get("rrf_score") or chunk.get("score") or 0.0)
        # Clamp display score to [0, 1] and convert to %.
        display_score = max(0.0, min(1.0, score))
        block = (
            f"[{label} {idx}] "
            f"({chunk.get('doc_title', 'Unknown')} — "
            f"page {chunk.get('page', '?')} — "
            f"relevance {int(display_score * 100)}%)\n"
            f"{(chunk.get('text') or '').strip()}"
        )
        blocks.append(block)

        dense_score = chunk.get("dense_score")
        rerank_score = chunk.get("final_score")
        rrf_score = chunk.get("rrf_score")
        sources.append(
            {
                "index": idx,
                "doc": chunk.get("doc_title", "Unknown"),
                "page": int(chunk.get("page", 0)),
                "score": round(display_score, 3),
                "faissSessionId": chunk.get("session_id", ""),
                "chunkText": chunk.get("text") or "",
                "denseScore": (
                    round(float(dense_score), 3) if dense_score is not None else None
                ),
                "rerankScore": (
                    round(float(rerank_score), 3) if rerank_score is not None else None
                ),
                "rrfScore": (
                    round(float(rrf_score), 4) if rrf_score is not None else None
                ),
            }
        )
    if not blocks:
        return "(कोई दस्तावेज़ संदर्भ उपलब्ध नहीं है।)", []
    return "\n\n---\n\n".join(blocks), sources


_BASE_RULES = """
You are the Vernacular FD Advisor — a multilingual fixed-deposit and banking-regulation assistant for Indian retail users. You are SEBI/RBI-aware, partnered with DICGC-insured banks, and your knowledge base contains official bank brochures, RBI circulars, DICGC rules, and tax notifications.

NON-NEGOTIABLE RULES — you must follow every single one:

1. CONTEXT-ONLY ANSWERS: Answer ONLY from the provided [{label} N] context blocks below. Never use general training knowledge to fill gaps. If the answer is not in the context, say so explicitly using exactly this line: "{not_found}"

2. INLINE CITATIONS: Every factual claim — every rate, every threshold, every penalty figure — MUST be followed by a citation in the form [{label} N] referencing the exact context block. No claim without a citation.

3. NEVER COMPUTE NUMBERS: For ANY arithmetic — maturity amount, TDS, interest earned, premature payout — you must say "let me compute that with the calculator tool" and stop. Do NOT do mental math.

4. RATES FROM CONTEXT ONLY: If a user asks for a rate, find it in the context. Never quote a rate from training memory.

5. DICGC / DEPOSIT INSURANCE: If relevant, explain coverage only from retrieved context with citations. Do NOT append a standalone boilerplate DICGC disclaimer at the end of the answer.

6. NO ADVICE LANGUAGE: Never say "best", "recommended", "you should buy", "guaranteed", "100% safe".

6a. NO PROFANITY OR ABUSE: Never use insults, slurs, or profane words in any language (including but not limited to हरामज़ादे, हरामी, कमीना, गांडू, मादरचोद, भोसड़ी, चूतिया, रंडी, साला, or English equivalents). Always use respectful forms of address (आप / आपका / "you" / "Sir/Ma'am"). If the user is rude, stay calm and professional.

7. PII PROTECTION: Never reproduce full PAN, full Aadhaar (12 digits), or full account numbers.

8. SCOPE: FDs, deposit insurance, KYC/VKYC, FD-related TDS only. Politely redirect for MFs, AIFs, equity, insurance.

9. LANGUAGE MATCH: Respond in the SAME LANGUAGE as the user.

10. LENGTH & TONE: 4–8 sentences. Plain language. Use parenthetical glosses for jargon.
""".strip()


_LANG_DIRECTIVE = {
    "hi": "LANGUAGE LOCK: This conversation is in HINDI. Respond in DEVANAGARI script ONLY. Every sentence MUST be in Hindi. Citations as [स्रोत N].",
    "bho": "LANGUAGE LOCK: This conversation is in BHOJPURI. Respond in Bhojpuri using Devanagari script ONLY. Citations as [स्रोत N].",
    "mai": "LANGUAGE LOCK: This conversation is in MAITHILI. Respond in Maithili using Devanagari script ONLY. Citations as [स्रोत N].",
    "mr": "LANGUAGE LOCK: This conversation is in MARATHI. Respond in MARATHI using DEVANAGARI script ONLY. Citations as [स्रोत N].",
    "bn": "LANGUAGE LOCK: This conversation is in BENGALI. Respond in BENGALI script ONLY. Citations as [উৎস N].",
    "as": "LANGUAGE LOCK: This conversation is in ASSAMESE. Respond in ASSAMESE using BENGALI/ASSAMESE script ONLY. Citations as [উৎস N].",
    "or": "LANGUAGE LOCK: This conversation is in ODIA. Respond in ODIA script ONLY. Citations as [ଉତ୍ସ N].",
    "gu": "LANGUAGE LOCK: This conversation is in GUJARATI. Respond in GUJARATI script ONLY. Citations as [સ્રોત N].",
    "pa": "LANGUAGE LOCK: This conversation is in PUNJABI. Respond in PUNJABI using GURMUKHI script ONLY. Citations as [ਸਰੋਤ N].",
    "ur": "LANGUAGE LOCK: This conversation is in URDU. Respond in URDU using ARABIC/Nasta\u2019liq script ONLY (right-to-left). Citations as [ماخذ N].",
    "ta": "LANGUAGE LOCK: This conversation is in TAMIL. Respond in TAMIL script ONLY. Citations as [ஆதாரம் N].",
    "te": "LANGUAGE LOCK: This conversation is in TELUGU. Respond in TELUGU script ONLY. Citations as [మూలం N].",
    "kn": "LANGUAGE LOCK: This conversation is in KANNADA. Respond in KANNADA script ONLY. Citations as [ಮೂಲ N].",
    "ml": "LANGUAGE LOCK: This conversation is in MALAYALAM. Respond in MALAYALAM script ONLY. Citations as [ഉറവിടം N].",
    "en": "LANGUAGE LOCK: This conversation is in ENGLISH. Respond in ENGLISH ONLY. Cite as [Source N].",
}


def get_prompt(language: str, context_blocks: str) -> str:
    """Build the full system prompt."""
    if language not in LANGUAGES:
        language = "en"
    rules = _BASE_RULES.format(
        label=SOURCE_LABEL[language],
        not_found=NOT_FOUND_LINE[language],
    )
    directive = _LANG_DIRECTIVE[language]
    parts = [
        directive,
        "",
        rules,
        "",
        directive,
        "",
        "RETRIEVED CONTEXT — use ONLY these blocks to answer. If the user's question is unrelated to anything below, output the not-found line.",
        "",
        context_blocks,
    ]
    return "\n".join(parts)


def add_dicgc_if_needed(text: str, bank: str | None, language: str) -> str:
    """No-op: automatic DICGC footer removed — answers rely on cited context only."""
    return text
