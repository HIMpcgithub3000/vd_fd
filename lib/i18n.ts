/**
 * Lightweight i18n table for the Vernacular FD Advisor chrome.
 *
 * `t(key, lang, vars?)` returns a translated string for the active UI
 * language. Bhojpuri/Maithili fall back to Hindi where a dedicated string
 * is not provided — they share Devanagari script and most chrome words.
 */

import type { Language } from '@/store/app-store';

type Vars = Record<string, string | number>;

type Strings = Partial<Record<Language, string>> & {
  hi: string;
  en: string;
};

export const STRINGS: Record<string, Strings> = {
  // ---- Brand ----
  'brand.name': { hi: 'Vernacular FD Advisor', en: 'Vernacular FD Advisor' },
  'brand.tagline': {
    hi: 'अपनी भाषा में, पैसों की जानकारी — सरल और भरोसेमंद',
    en: 'Banking and FD information in your own language',
  },
  'brand.subtitle': { hi: 'आपका वित्तीय सहायक', en: 'Your banking helper' },

  // ---- Sidebar sections ----
  'section.language': { hi: 'भाषा', en: 'Language' },
  'section.languageHint': {
    hi: 'अपनी भाषा चुनिए — सब कुछ उसी भाषा में दिखेगा',
    en: 'Pick your language — everything updates instantly',
  },
  'section.document': { hi: 'अपना दस्तावेज़ जोड़ें', en: 'Add a document' },
  'section.retrieval': { hi: 'पुनर्प्राप्ति', en: 'Retrieval' },
  'section.activeSources': { hi: 'दस्तावेज़', en: 'Documents' },
  'section.quickFacts': { hi: 'ज़रूरी जानकारी', en: 'Good to know' },
  'section.eval': { hi: 'मूल्यांकन', en: 'Evaluation' },

  // ---- Retrieval fields (deprecated; kept so old keys still resolve) ----
  'field.vectorDb': { hi: 'वेक्टर डेटाबेस', en: 'Vector DB' },
  'field.embeddings': { hi: 'एम्बेडिंग', en: 'Embeddings' },
  'field.chunking': { hi: 'खंडन', en: 'Chunking' },
  'field.topK': { hi: 'Top-K', en: 'Top-K' },
  'field.topKHint': {
    hi: 'RAG में शीर्ष खंडों की संख्या',
    en: 'Number of top chunks fed to the LLM',
  },
  'value.embeddings': {
    hi: 'BGE-M3 · बहुभाषी',
    en: 'BGE-M3 · multilingual',
  },
  'value.chunking': {
    hi: 'वाक्य आधारित · ~512 शब्द',
    en: 'Sentence blocks · ~512 words',
  },

  // ---- Active sources ----
  'sources.empty': {
    hi: 'अभी कोई दस्तावेज़ नहीं चुना है — ऊपर से जोड़ें',
    en: 'No documents added yet — upload one above',
  },
  'sources.addMore': {
    hi: '+ कोई और दस्तावेज़ जोड़ें',
    en: '+ Add another document',
  },
  'sources.remove': { hi: 'हटाएँ', en: 'Remove' },

  // ---- Document upload ----
  'upload.dropPrimary': {
    hi: 'अपना PDF यहाँ डालें',
    en: 'Drop your PDF here',
  },
  'upload.dropSecondary': {
    hi: 'या क्लिक करके चुनें',
    en: 'or click to choose a file',
  },
  'upload.errType': {
    hi: 'सिर्फ़ PDF, TXT या MD फ़ाइल चलेगी।',
    en: 'Only PDF, TXT, or MD files are supported.',
  },
  'upload.indexedChunks': {
    hi: 'अब इस दस्तावेज़ से जवाब मिलेंगे।',
    en: 'You can now ask questions from this document.',
  },
  'upload.busyTitle': {
    hi: 'दस्तावेज़ पढ़ा जा रहा है…',
    en: 'Reading your document…',
  },
  'upload.successTitle': {
    hi: 'दस्तावेज़ जुड़ गया है',
    en: 'Document added',
  },
  'upload.errorTitle': {
    hi: 'दस्तावेज़ नहीं जुड़ पाया',
    en: 'Could not add this document',
  },
  'upload.hint': {
    hi: 'PDF में टाइप किया हुआ टेक्स्ट होना ज़रूरी है (स्कैन की हुई फ़ोटो नहीं चलेगी)।',
    en: 'PDF must contain typed text (scanned images will not work).',
  },

  // ---- Quick facts ----
  'facts.dicgcLabel': { hi: 'आपका पैसा सुरक्षित है', en: 'Your deposit is insured' },
  'facts.dicgcText': {
    hi: 'हर बैंक में आपके ₹5 लाख तक की जमा (मूलधन + ब्याज) RBI की DICGC योजना से सुरक्षित होती है।',
    en: 'In every bank, deposits up to ₹5 lakh per depositor (principal + interest) are insured by the RBI’s DICGC.',
  },
  'facts.seniorLabel': { hi: 'सीनियर सिटिज़न को थोड़ा ज़्यादा ब्याज', en: 'Senior citizens get a little more' },
  'facts.seniorText': {
    hi: '60 साल और उससे ऊपर के ग्राहकों को आमतौर पर 0.25%–0.75% तक ज़्यादा ब्याज मिलता है।',
    en: 'Customers aged 60 and above usually get about 0.25%–0.75% extra interest.',
  },
  'facts.prematureLabel': { hi: 'समय से पहले FD तोड़ना', en: 'Breaking an FD early' },
  'facts.prematureText': {
    hi: 'आमतौर पर 0.5–1% कम ब्याज मिलता है — असली दर के लिए अपने बैंक का दस्तावेज़ देखें।',
    en: 'You usually get about 0.5–1% less interest — check your bank’s document for the exact rule.',
  },

  // ---- Eval ----
  'eval.citationQa': { hi: 'उद्धरण जाँच', en: 'Citation QA' },
  'eval.citationQaHint': {
    hi: 'उत्तर में [स्रोत N] मौजूद होना चाहिए',
    en: 'Every answer must contain [Source N]',
  },
  'eval.hallucinationGuard': { hi: 'कल्पना-निरोध', en: 'Hallucination guard' },
  'eval.hallucinationGuardHint': {
    hi: 'केवल पुनर्प्राप्त संदर्भ से तथ्य',
    en: 'Facts only from retrieved context',
  },
  'eval.languageMatch': { hi: 'भाषा मिलान', en: 'Language match' },
  'eval.languageMatchHint': {
    hi: 'उपयोगकर्ता की भाषा में उत्तर',
    en: "Answer in the user's language",
  },
  'eval.judgeNote': {
    hi: 'हैकाथॉन जज के लिए स्क्रीनशॉट सहेजें',
    en: 'Save screenshots for hackathon judges',
  },

  // ---- Nav ----
  'nav.compare': { hi: 'तुलना', en: 'Compare' },
  'nav.discover': { hi: 'FD खोजें', en: 'Discover FDs' },

  // ---- Footer ----
  'footer.darkMode': { hi: 'गहरा रूप', en: 'Dark mode' },
  'footer.disclaimer': {
    hi: 'यह जानकारी समझाने के लिए है — वित्तीय सलाह नहीं। बड़े फैसले से पहले अपने बैंक से पुष्टि करें।',
    en: 'For your understanding only — not financial advice. Please confirm with your bank before any big decision.',
  },

  // ---- Header / status ----
  'status.noSources': {
    hi: 'अपनी भाषा में सवाल पूछिए — हम जवाब बैंक के दस्तावेज़ से देंगे',
    en: 'Ask in your language — answers come from official bank documents',
  },
  'status.activeSources': {
    hi: '{count} दस्तावेज़ से जवाब मिलेंगे · {lang}',
    en: 'Answers will come from {count} document(s) · {lang}',
  },
  'status.menu': { hi: 'मेनू', en: 'Menu' },

  // ---- Chat input / disclaimer ----
  'chat.placeholder': {
    hi: 'अपना सवाल यहाँ लिखें — या नीचे 🎤 दबाकर बोलें',
    en: 'Type your question here — or press 🎤 to speak',
    bho: 'अपना सवाल लिखीं — या नीचे 🎤 दबा के बोलीं',
    mai: 'अपन प्रश्न लिखू — या नीचाँ 🎤 दबा क बाजू',
  },
  'chat.disclaimer': {
    hi: 'यह जानकारी समझाने के लिए है — वित्तीय सलाह नहीं। बड़े फैसले से पहले अपने बैंक से पुष्टि करें।',
    en: 'For your understanding only — not financial advice. Please confirm with your bank before any big decision.',
  },
  'chat.voiceHint': {
    hi: 'सबसे साफ़ आवाज़ Chrome में चलती है · हर जवाब को 🔊 दबाकर सुना जा सकता है',
    en: 'Voice works best in Chrome · tap 🔊 on any answer to hear it read aloud',
  },
  'chat.examples': { hi: 'कुछ उदाहरण सवाल', en: 'Some example questions' },
  'chat.startVoice': { hi: 'अपनी भाषा में बोलिए', en: 'Speak your question' },
  'chat.stopVoice': { hi: 'रुकिए', en: 'Stop' },
  'chat.voiceCallout': {
    hi: '🎤 बोलकर पूछें',
    en: '🎤 Ask by voice',
  },

  // ---- Empty state ----
  'empty.greeting': {
    hi: 'नमस्ते 🙏',
    en: 'Hello',
  },
  'empty.heroTitle': {
    hi: 'अपनी भाषा में पूछिए, हम समझाएँगे',
    en: 'Ask in your language. We will explain.',
  },
  'empty.descPrefix': {
    hi: 'FD, ब्याज, TDS, DICGC, सीनियर रेट — ',
    en: 'FDs, interest, TDS, DICGC, senior rates — ',
  },
  'empty.descEmphasis': {
    hi: 'अपनी भाषा में आसानी से समझें',
    en: 'understand it easily in your own language',
  },
  'empty.citation': {
    hi: 'हर जवाब के साथ बैंक का असली दस्तावेज़ भी दिखाया जाएगा।',
    en: 'Every answer comes with the actual bank document it is based on.',
  },
  'empty.trust.rbi': { hi: 'RBI के दस्तावेज़ों से', en: 'Based on RBI documents' },
  'empty.trust.dicgc': { hi: '₹5 लाख तक जमा सुरक्षित', en: 'Deposits up to ₹5 lakh insured' },
  'empty.trust.bank': { hi: 'सीधे बैंक के दस्तावेज़ से', en: 'Straight from the bank document' },

  // ---- Citation badge / message bubble ----
  // Note: 'citation.tag' must remain "स्रोत"/"Source" because it is the literal
  // token the model emits inside answers, e.g. "[स्रोत 1]". User-facing chrome
  // uses 'bubble.viewSources' / 'drawer.title' instead, which read "दस्तावेज़".
  'citation.tag': { hi: 'स्रोत', en: 'Source' },
  'bubble.evidence': { hi: 'साक्ष्य-आधारित', en: 'Evidence grounded' },
  'bubble.evidenceSub': {
    hi: 'दस्तावेज़ से उत्पन्न · केवल पुनर्प्राप्त संदर्भ',
    en: 'Generated from documents · retrieved context only',
  },
  'bubble.viewSources': { hi: 'दस्तावेज़ देखिए', en: 'See documents' },
  'bubble.listen': { hi: 'सुनिए', en: 'Listen' },
  'bubble.stop': { hi: 'रुकिए', en: 'Stop' },
  'bubble.confidenceHigh': { hi: 'उच्च विश्वास', en: 'High confidence' },
  'bubble.confidenceMedium': { hi: 'मध्यम विश्वास', en: 'Medium confidence' },
  'bubble.confidenceLow': { hi: 'कम विश्वास', en: 'Low confidence' },
  'bubble.relevance': { hi: 'सप्रसंगता', en: 'relevance' },
  'bubble.page': { hi: 'पन्ना', en: 'Page' },
  'bubble.unreliableTitle': { hi: 'पूरी जानकारी नहीं मिली', en: 'Could not confirm' },
  'bubble.unreliableBody': {
    hi: 'यह जवाब हमारे पास मौजूद दस्तावेज़ों में पूरी तरह नहीं मिला। बेहतर होगा कि आप अपने बैंक से सीधे पुष्टि करें।',
    en: 'We could not fully confirm this from the documents we have. Please check directly with your bank.',
  },
  'bubble.deterministicLabel': { hi: 'सीधे जोड़कर निकाली गई गणना', en: 'Calculated step by step' },
  'discover.insightLabel': {
    hi: 'उपयोगकर्ता व्यवहार अंतर्दृष्टि',
    bho: 'उपयोगकर्ता व्यवहार अंतर्दृष्टि',
    mai: 'उपयोगकर्ता व्यवहार अंतर्दृष्टि',
    en: 'User Behavior Insight',
  },

  // ---- Source drawer ----
  'drawer.title': { hi: 'दस्तावेज़', en: 'Document' },
  'drawer.subtitle': { hi: 'जवाब इस हिस्से से लिया गया है', en: 'The answer is taken from this passage' },
  'drawer.fieldDoc': { hi: 'दस्तावेज़ का नाम', en: 'Document' },
  'drawer.fieldPage': { hi: 'पन्ना', en: 'Page' },
  'drawer.fieldScore': { hi: 'सप्रसंग स्कोर', en: 'Relevance' },
  'drawer.fieldFaiss': { hi: 'FAISS सत्र', en: 'FAISS session' },
  'drawer.chunkHeading': { hi: 'दस्तावेज़ का यह हिस्सा', en: 'This part of the document' },
  'drawer.close': { hi: 'बंद करें', en: 'Close' },

  // ---- Maturity calculator ----
  'calc.title': { hi: 'मैच्योरिटी कैल्कुलेटर', en: 'Maturity calculator' },
  'calc.principal': { hi: 'मूलधन (₹)', en: 'Principal (₹)' },
  'calc.rate': { hi: 'ब्याज दर (% सालाना)', en: 'Interest rate (% p.a.)' },
  'calc.years': { hi: 'अवधि (वर्ष)', en: 'Tenor (years)' },
  'calc.senior': { hi: 'वरिष्ठ नागरिक (60+)', en: 'Senior citizen (60+)' },
  'calc.maturityAmount': { hi: 'मैच्योरिटी राशि', en: 'Maturity amount' },
  'calc.interest': { hi: 'ब्याज', en: 'Interest' },
  'calc.tds': { hi: 'TDS कटौती', en: 'TDS deducted' },
  'calc.net': { hi: 'हाथ में', en: 'Net receivable' },
  'calc.note': {
    hi: 'त्रैमासिक चक्रवृद्धि · TDS @10% (₹40,000 से अधिक; वरिष्ठ ₹50,000)। यह नियतात्मक गणना है — LLM अनुमान नहीं।',
    en: 'Quarterly compounding · TDS @ 10% above ₹40,000 (₹50,000 senior). Deterministic — never an LLM guess.',
  },

  // ---- Health badges ----
  'health.ragApi': { hi: 'RAG API', en: 'RAG API' },
  'health.ollama': { hi: 'Ollama', en: 'Ollama' },
  'health.ok': { hi: 'चालू', en: 'ok' },
  'health.live': { hi: 'सक्रिय', en: 'live' },
  'health.down': { hi: 'बंद', en: 'down' },

  // ---- Compare workbench ----
  'compare.title': { hi: 'तुलना वर्कबेंच', en: 'Compare Workbench' },
  'compare.subtitle': {
    hi: 'समानांतर RAG · साथ-साथ उद्धरण · AI सारांश',
    en: 'Parallel RAG queries · cited side-by-side · AI summary',
  },
  'compare.banksHeading': {
    hi: 'तुलना के लिए बैंक (2–4)',
    en: 'Banks to compare (2–4)',
  },
  'compare.clearAll': { hi: 'सब हटाएँ', en: 'Clear all' },
  'compare.addBank': { hi: 'बैंक जोड़ें', en: 'Add bank' },
  'compare.noMoreBanks': {
    hi: 'और बैंक उपलब्ध नहीं।',
    en: 'No more banks available.',
  },
  'compare.removePolicy': { hi: 'पॉलिसी हटाएँ', en: 'Remove policy' },
  'compare.placeholder': {
    hi: 'अपना प्रश्न लिखें…',
    en: 'Type your question…',
  },
  'compare.defaultQuery': {
    hi: 'प्रीमेच्योर withdrawal पर पेनल्टी कितनी है?',
    en: 'What is the premature withdrawal penalty?',
  },
  'compare.askAll': { hi: 'सबकी तुलना', en: 'Compare All' },
  'compare.asking': { hi: 'तुलना हो रही…', en: 'Comparing…' },
  'compare.errMinTwo': {
    hi: 'कम से कम 2 बैंक चुनें।',
    en: 'Select at least 2 banks to compare.',
  },
  'compare.aiSummary': { hi: '🤖 AI तुलना सारांश', en: '🤖 AI comparison summary' },
  'compare.back': { hi: 'वापस', en: 'Back' },

  // ---- Discover ----
  'discover.title': { hi: 'FD खोज', en: 'FD Discovery' },
  'discover.subtitle': {
    hi: 'सातों अनुक्रमित बैंक · DICGC बीमित',
    en: 'All seven indexed banks · DICGC-insured',
  },
  'discover.openChat': { hi: 'चैट', en: 'Chat' },
  'discover.openCompare': { hi: 'तुलना →', en: 'Compare →' },
  'discover.searchPlaceholder': { hi: 'बैंक खोजें…', en: 'Search bank…' },
  'discover.bankTypeAll': { hi: 'सभी बैंक प्रकार', en: 'All bank types' },
  'discover.bankTypeSCB': { hi: 'अनुसूचित वाणिज्यिक', en: 'Scheduled Commercial' },
  'discover.bankTypeSFB': { hi: 'लघु वित्त बैंक', en: 'Small Finance Bank' },
  'discover.minRate': { hi: 'न्यूनतम दर', en: 'Min rate' },
  'discover.loading': { hi: 'पॉलिसी लोड हो रही…', en: 'Loading policies…' },
  'discover.noMatches': { hi: 'कोई मिलान नहीं।', en: 'No matches.' },
  'discover.minDeposit': { hi: 'न्यूनतम जमा', en: 'Min deposit' },
  'discover.prematurePenalty': { hi: 'प्रीमेच्योर पेनल्टी', en: 'Premature penalty' },
  'discover.addToCompare': { hi: 'तुलना में जोड़ें', en: 'Add to Compare' },
  'discover.openQa': { hi: 'Q&A', en: 'Q&A' },
  'discover.seniorPrefix': { hi: 'सीनियर', en: 'Senior' },

  // ---- Source authority ----
  'authority.rbi': { hi: 'RBI', en: 'RBI' },
  'authority.rbi.trust': { hi: 'सत्यापित RBI स्रोत', en: 'Verified RBI Source' },
  'authority.dicgc': { hi: 'DICGC', en: 'DICGC' },
  'authority.dicgc.trust': { hi: 'जमा बीमा प्राधिकरण', en: 'Deposit Insurance Authority' },
  'authority.tax': { hi: 'आयकर', en: 'Tax Rule' },
  'authority.tax.trust': { hi: 'आयकर अधिनियम', en: 'Income-Tax Act' },
  'authority.sebi': { hi: 'SEBI / KYC', en: 'SEBI / KYC' },
  'authority.sebi.trust': { hi: 'सेबी विनियामक स्रोत', en: 'SEBI regulatory source' },
  'authority.rate_card': { hi: 'दर सूची', en: 'Rate-card' },
  'authority.rate_card.trust': { hi: 'बैंक की वर्तमान दर सूची', en: 'Bank-issued rate-card' },
  'authority.bank': { hi: 'बैंक दस्तावेज़', en: 'Bank document' },
  'authority.bank.trust': { hi: 'बैंक-निर्गत ब्रोशर', en: 'Bank-issued brochure' },
  'authority.upload': { hi: 'अपलोड', en: 'Uploaded' },
  'authority.upload.trust': { hi: 'उपयोगकर्ता द्वारा अपलोड', en: 'Uploaded knowledge source' },
  'authority.other': { hi: 'स्रोत', en: 'Source' },
  'authority.other.trust': { hi: 'अन्य स्रोत', en: 'Other source' },

  // ---- Retrieval telemetry strip ----
  'telemetry.title': { hi: 'पुनर्प्राप्ति विवरण', en: 'Retrieval' },
  'telemetry.chunksSearched': { hi: 'खंड खोजे', en: 'chunks searched' },
  'telemetry.topScore': { hi: 'सर्वोत्तम स्कोर', en: 'top score' },
  'telemetry.path.rerank': {
    hi: 'BM25 + सघन + क्रॉस-एनकोडर',
    en: 'BM25 + dense + cross-encoder',
  },
  'telemetry.path.rrf': {
    hi: 'BM25 + सघन (RRF, बिना रीरैंक)',
    en: 'BM25 + dense (RRF only, no reranker)',
  },
  'telemetry.sessions': { hi: 'अनुक्रमणिका', en: 'indices' },
  'telemetry.dense': { hi: 'सघन', en: 'dense' },
  'telemetry.rerank': { hi: 'रीरैंक', en: 'rerank' },
  'telemetry.rrf': { hi: 'RRF', en: 'RRF' },

  // ---- Inline source preview ----
  'preview.viewFull': { hi: 'पूरा खंड देखें', en: 'View full chunk' },
  'preview.from': { hi: 'से', en: 'from' },

  // ---- Evidence highlighting ----
  'evidence.fromSource': { hi: 'स्रोत से सत्यापित', en: 'Verified from source' },

  // ---- Onboarding ----
  'onboarding.title': { hi: 'अपनी भाषा चुनिए', en: 'Choose your language' },
  'onboarding.subtitle': {
    hi: 'जब चाहें, बाद में बदल सकते हैं।',
    en: 'You can change it any time later.',
  },
  'onboarding.footer': {
    hi: 'पूरा ऐप — सवाल, जवाब, और दस्तावेज़ — आपकी चुनी हुई भाषा में दिखेगा।',
    en: 'The whole app — questions, answers, and documents — appears in the language you choose.',
  },
  'onboarding.speakers': { hi: 'बोलने वाले', en: 'speakers' },
};

/**
 * Translate `key` for `lang`. Falls back: bho/mai → hi → en → key.
 * `vars` performs simple `{name}` substitution.
 */
/** Latin-script languages (English) get the english chrome strings; everything
 *  else falls back to the Hindi chrome string when no native chrome string is
 *  defined — that's safer than mid-sentence English chrome around a vernacular
 *  body. The translated UI surface is gradually expanding over time. */
const LATIN_SCRIPT_LANGS: Language[] = ['en'];

export function t(key: string, lang: Language, vars?: Vars): string {
  const entry = STRINGS[key];
  if (!entry) return key;
  const native = (entry as Record<string, string | undefined>)[lang];
  const value =
    native ||
    (LATIN_SCRIPT_LANGS.includes(lang) ? entry.en : entry.hi) ||
    entry.hi ||
    entry.en ||
    key;
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (_, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : `{${k}}`,
  );
}

const DEVANAGARI_LANGS: Language[] = ['hi', 'bho', 'mai', 'mr'];

/** True when the active language uses Devanagari script (used to apply the
 *  `.devanagari` font-loading CSS class). For other Indic scripts the
 *  browser's default font stack handles glyph rendering. */
export function isDevanagari(lang: Language): boolean {
  return DEVANAGARI_LANGS.includes(lang);
}
