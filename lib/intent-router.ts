/**
 * Mirrors rag_backend/retrieval/intent_router.py for Next.js /api/chat.
 */

export type Intent =
  | 'out_of_scope'
  | 'emotional_panic'
  | 'calculation'
  | 'tax_clarification'
  | 'procedural_help'
  | 'senior_citizen_special'
  | 'safety_doubt'
  | 'compare_rates'
  | 'product_definition'
  | 'regulatory_status'
  | 'complaint'
  | 'general_fd';

const PATTERNS: Array<{ intent: Intent; re: RegExp[] }> = [
  {
    intent: 'out_of_scope',
    re: [
      /\bSIF\b/i,
      /\bAIF\b/i,
      /\bPMS\b/i,
      /\bmutual\s*fund\b/i,
      /\bMF\b/i,
      /\bequity\b/i,
      /\bstock\b/i,
      /\bELSS\b/i,
      /\bnifty\b/i,
      /\bsensex\b/i,
      /\bNFO\b/i,
      /\bsmallcap\b/i,
      /\blargecap\b/i,
      /\bmidcap\b/i,
      /\bETF\b/i,
      /\bindex\s+fund\b/i,
      /\bliquid\s+fund\b/i,
      /\barbitrage\s+fund\b/i,
    ],
  },
  {
    intent: 'emotional_panic',
    re: [
      /\bbank\s+fail\b/i,
      /\bdub\s+gaya\b/i,
      /\bdub\s+jayega\b/i,
      /\bdoob\b/i,
      /\bfail\s+ho\b/i,
      /\bpaisa\s+jaayega\b/i,
      /\bnews\s+me\b/i,
      /\bbankrupt\b/i,
      /\bcollapse\b/i,
    ],
  },
  {
    intent: 'calculation',
    re: [
      /\bkitna\s+milega\b/i,
      /\bkitna\s+banega\b/i,
      /\bkitni\s+rashi\b/i,
      /\bmaturity\s+amount\b/i,
      /\bcalculate\b/i,
      /\bhow\s+much.*get\b/i,
      /\binterest\s+calcu\b/i,
    ],
  },
  {
    intent: 'tax_clarification',
    re: [
      /\bTDS\b/i,
      /\b15G\b/i,
      /\b15H\b/i,
      /\bincome\s+tax\b/i,
      /\bslab\b/i,
      /\bITR\b/i,
      /\b80C\b/i,
      /\bdeduction\b/i,
      /\btax\s+saver\b/i,
    ],
  },
  {
    intent: 'procedural_help',
    re: [
      /\bpremature\b/i,
      /\btod\b/i,
      /\btodni\b/i,
      /\bbreak\s+FD\b/i,
      /\bnikaal\b/i,
      /\bwithdraw\b/i,
      /\bclosure\b/i,
      /\bbandh\s+karna\b/i,
      /\bkaise\s+karu\b/i,
      /\bprocess\b/i,
      /\bkab\s+milega\b/i,
      /\bpenalty\b/i,
    ],
  },
  {
    intent: 'senior_citizen_special',
    re: [
      /\bsenior\b/i,
      /\bbuzurg\b/i,
      /\b60\s+saal\b/i,
      /\b65\s+saal\b/i,
      /\bretire\b/i,
      /\bpension\b/i,
      /\bmonthly\s+income\b/i,
      /\bpapa\b/i,
      /\bmummy\b/i,
    ],
  },
  {
    intent: 'safety_doubt',
    re: [
      /\bsafe\b/i,
      /\bsecure\b/i,
      /\bsahi\s+hai\b/i,
      /\bbharosa\b/i,
      /\bDICGC\b/i,
      /\binsured\b/i,
      /\brisk\b/i,
      /\bfraud\b/i,
      /\bcheat\b/i,
    ],
  },
  {
    intent: 'compare_rates',
    re: [
      /\bsabse\s+zyada\b/i,
      /\bbest\s+rate\b/i,
      /\bhighest\s+rate\b/i,
      /\bcompare\b/i,
      /\bvs\b/i,
      /\bversus\b/i,
      /\bkonsa\s+bank\b/i,
      /\bwhich\s+bank\b/i,
      /\bcomparison\b/i,
    ],
  },
  {
    intent: 'product_definition',
    re: [
      /\bkya\s+hota\b/i,
      /\bkya\s+hai\b/i,
      /\bmatlab\b/i,
      /\bsamjhao\b/i,
      /\bexplain\b/i,
      /\bwhat\s+is\b/i,
      /\bdefinition\b/i,
      /\bFD\s+kya\b/i,
    ],
  },
  {
    intent: 'regulatory_status',
    re: [
      /\bSEBI\s+registered\b/i,
      /\bRBI\s+licence\b/i,
      /\bapproved\s+by\b/i,
      /\blegal\b/i,
      /\bombudsman\b/i,
      /\bgrievance\b/i,
    ],
  },
  {
    intent: 'complaint',
    re: [
      /\bVKYC\b/i,
      /\bKYC\s+fail\b/i,
      /\bkaam\s+nahi\b/i,
      /\bstuck\b/i,
      /\berror\b/i,
      /\bsupport\b/i,
      /\bhelpline\b/i,
      /\bnahi\s+sun\s+raha\b/i,
    ],
  },
];

const OUT_OF_SCOPE: Record<string, string> = {
  hi: 'मैं केवल Fixed Deposits, RBI नियमों, DICGC और FD से जुड़े TDS के बारे में जानकारी दे सकता हूँ। Mutual Funds, SIF, AIF, या equity investments के लिए कृपया SEBI-registered advisor से संपर्क करें।',
  bho: 'हम सिरिफ Fixed Deposit, RBI नियम, आ DICGC के बारे में जानकारी देत हईं। Mutual Fund या equity खातिर SEBI-registered advisor से मिलीं।',
  mai: 'हम मात्र Fixed Deposit, RBI नियम आ DICGC विषयमे जानकारी दैत छी। Mutual Fund / equity लेल SEBI-registered advisor सँ संपर्क करी।',
  mr: 'मी केवळ Fixed Deposits, RBI नियम, DICGC आणि FD-संबंधित TDS विषयी माहिती देऊ शकतो. Mutual Funds, SIF, AIF, किंवा equity साठी SEBI-नोंदणीकृत सल्लागाराचा संपर्क करा.',
  bn: 'আমি কেবল Fixed Deposits, RBI নিয়ম, DICGC এবং FD-সংক্রান্ত TDS সম্পর্কে তথ্য দিতে পারি। Mutual Funds, SIF, AIF, বা equity investment-এর জন্য একজন SEBI-registered advisor-এর সঙ্গে যোগাযোগ করুন।',
  as: 'মই কেৱল Fixed Deposits, RBI নিয়ম, DICGC আৰু FD-সম্পৰ্কীয় TDS বিষয়ে তথ্য দিব পাৰোঁ। Mutual Funds বা equity বাবে SEBI-registered advisor-ৰ সৈতে যোগাযোগ কৰক।',
  or: 'ମୁଁ କେବଳ Fixed Deposits, RBI ନିୟମ, DICGC ଓ FD-ସମ୍ବନ୍ଧୀୟ TDS ବିଷୟରେ ସୂଚନା ଦେଇପାରେ। Mutual Funds, SIF, AIF, କିମ୍ବା equity ପାଇଁ ଦୟାକରି ଜଣେ SEBI-ପଞ୍ଜୀକୃତ ଉପଦେଷ୍ଟା ସହିତ ଯୋଗାଯୋଗ କରନ୍ତୁ।',
  gu: 'હું ફક્ત Fixed Deposits, RBI નિયમો, DICGC અને FD-સંબંધિત TDS વિશે માહિતી આપી શકું છું. Mutual Funds, SIF, AIF, અથવા equity માટે કૃપા કરીને SEBI-નોંધાયેલા સલાહકારનો સંપર્ક કરો.',
  pa: 'ਮੈਂ ਸਿਰਫ਼ Fixed Deposits, RBI ਨਿਯਮ, DICGC ਅਤੇ FD ਨਾਲ ਸਬੰਧਿਤ TDS ਬਾਰੇ ਜਾਣਕਾਰੀ ਦੇ ਸਕਦਾ ਹਾਂ। Mutual Funds, SIF, AIF, ਜਾਂ equity ਲਈ ਕਿਰਪਾ ਕਰਕੇ SEBI-ਰਜਿਸਟਰਡ ਸਲਾਹਕਾਰ ਨਾਲ ਸੰਪਰਕ ਕਰੋ।',
  ur: 'میں صرف Fixed Deposits، RBI ضوابط، DICGC اور FD سے متعلق TDS کے بارے میں معلومات دے سکتا ہوں۔ Mutual Funds، SIF، AIF، یا equity کے لیے براہ کرم کسی SEBI-رجسٹرڈ ایڈوائزر سے رابطہ کریں۔',
  ta: 'நான் Fixed Deposits, RBI விதிமுறைகள், DICGC மற்றும் FD தொடர்பான TDS குறித்த தகவல்களை மட்டுமே வழங்க முடியும். Mutual Funds, SIF, AIF, அல்லது equity முதலீடுகளுக்கு SEBI-பதிவுசெய்யப்பட்ட ஆலோசகரை அணுகவும்.',
  te: 'నేను Fixed Deposits, RBI నియమాలు, DICGC మరియు FD-సంబంధిత TDS గురించి మాత్రమే సమాచారం ఇవ్వగలను. Mutual Funds, SIF, AIF, లేదా equity కోసం దయచేసి SEBI-నమోదిత సలహాదారుని సంప్రదించండి.',
  kn: 'ನಾನು Fixed Deposits, RBI ನಿಯಮಗಳು, DICGC ಮತ್ತು FD-ಸಂಬಂಧಿತ TDS ಕುರಿತು ಮಾತ್ರ ಮಾಹಿತಿಯನ್ನು ನೀಡಬಲ್ಲೆ. Mutual Funds, SIF, AIF, ಅಥವಾ equity ಗಾಗಿ ದಯವಿಟ್ಟು SEBI-ನೋಂದಾಯಿತ ಸಲಹೆಗಾರರನ್ನು ಸಂಪರ್ಕಿಸಿ.',
  ml: 'എനിക്ക് Fixed Deposits, RBI നിയമങ്ങൾ, DICGC, FD-സംബന്ധിയായ TDS എന്നിവയെക്കുറിച്ച് മാത്രമേ വിവരം നൽകാൻ കഴിയൂ. Mutual Funds, SIF, AIF, അല്ലെങ്കിൽ equity-യ്ക്കായി ദയവായി SEBI-രജിസ്റ്റേർഡ് ഉപദേശകനെ സമീപിക്കുക.',
  en: 'I handle Fixed Deposit, RBI regulations, and DICGC queries only. For Mutual Funds, SIF, AIF, or equity investments please consult a SEBI-registered advisor.',
};

const PRIORITY: Partial<Record<Intent, string[]>> = {
  emotional_panic: ['kb_dicgc', 'kb_rbi_master'],
  calculation: ['kb_rbi_master'],
  tax_clarification: ['kb_rbi_master', 'kb_tax'],
  procedural_help: ['kb_rbi_master', 'kb_dicgc'],
  senior_citizen_special: ['kb_rbi_master', 'kb_dicgc'],
  safety_doubt: ['kb_dicgc', 'kb_rbi_master'],
  regulatory_status: ['kb_kyc', 'kb_rbi_master'],
  complaint: ['kb_kyc'],
};

export function classifyIntent(query: string): Intent {
  for (const { intent, re } of PATTERNS) {
    for (const r of re) {
      if (r.test(query)) return intent;
    }
  }
  return 'general_fd';
}

export function outOfScopeMessage(language: string): string {
  return OUT_OF_SCOPE[language] ?? OUT_OF_SCOPE.en;
}

export type RetrievalPlan = {
  skip: boolean;
  sessions: string[];
  topK: number;
  prependEmpathy: boolean;
};

export function getRetrievalPlan(intent: Intent, kbSessionIds: string[], defaultTopK: number): RetrievalPlan {
  if (intent === 'out_of_scope') {
    return { skip: true, sessions: [], topK: 0, prependEmpathy: false };
  }
  const all = kbSessionIds.filter(Boolean);
  const priority = PRIORITY[intent];
  let sessions: string[];
  if (priority?.length) {
    sessions = priority.filter((s) => all.includes(s));
    if (sessions.length === 0) sessions = [...all];
  } else {
    sessions = [...all];
  }
  const topK =
    intent === 'calculation' || intent === 'product_definition' ? Math.min(5, defaultTopK) : defaultTopK;
  const prependEmpathy = intent === 'emotional_panic' || intent === 'safety_doubt';
  return { skip: false, sessions, topK, prependEmpathy };
}

export const EMPATHY_SYSTEM_ADDON =
  'The user sounds worried about safety or news. Begin with ONE short empathetic sentence (≤12 words) before giving facts and citations. Strict rule: that empathetic sentence MUST be in the same language as the LANGUAGE LOCK above (English-only when locked to English, Hindi-only when locked to Hindi). Do not mix languages.';
