/**
 * Vernacular FD Advisor — Multilingual Financial Glossary.
 *
 * Each term carries Hindi (Devanagari), Bhojpuri, Maithili, and English
 * definitions plus a rural/everyday analogy that helps Tier 2/3 users.
 * The `explain_term` tool reads from this map.
 */

import type { Language } from '@/store/app-store';

export type { Language };

export type GlossaryEntry = Partial<Record<Language, string>> & {
  en: string;
  analogy: string;
};

export const glossary: Record<string, GlossaryEntry> = {
  FD: {
    hi: 'फिक्स्ड डिपॉज़िट — एक तय अवधि के लिए बैंक में रखी गई जमा राशि जिस पर पहले से तय ब्याज मिलता है।',
    bho: 'फिक्स्ड डिपॉज़िट — तय समय खातिर बैंक में रखल पैसा जेकरा पर तय ब्याज मिलेला।',
    mai: 'फिक्स्ड डिपॉजिट — एक निश्चित अवधि लेल बैंक में राखल जमा राशि जाहि पर पहिनहि तय ब्याज भेटैत अछि।',
    en: 'Fixed Deposit — a sum placed with a bank for a fixed tenor at a pre-agreed interest rate.',
    analogy: 'अनाज को कोठी में बंद करना — समय पूरा होने तक हाथ नहीं लगाते, बदले में सुरक्षा मिलती है।',
  },
  tenor: {
    hi: 'जमा की अवधि — जितने दिनों/महीनों/वर्षों के लिए FD किया गया है।',
    bho: 'जमा के अवधि — जतना दिन खातिर FD कइल गइल बा।',
    mai: 'जमा कें अवधि — जतेक दिन / मास / वर्ष लेल FD कएल गेल अछि।',
    en: 'Tenor — the duration for which the FD is locked in (e.g. 7 days to 10 years).',
    analogy: 'खेत में बीज बोना — फसल पकने में जितना समय, उतना तेनुर।',
  },
  maturity: {
    hi: 'परिपक्वता — वह तारीख जब FD पूरी हो जाती है और मूलधन + ब्याज वापस मिलता है।',
    bho: 'मैच्योरिटी — ऊ तारीख जब FD पूरा हो जाला आ पैसा वापस मिलेला।',
    mai: 'परिपक्वता — ओ तिथि जखन FD पूर्ण भ’ जाइत अछि आ राशि भेटैत अछि।',
    en: 'Maturity — the date the FD completes and principal + interest is returned.',
    analogy: 'फसल पकने का दिन — तब काटी जाती है।',
  },
  interest_rate: {
    hi: 'ब्याज दर — हर साल जमा राशि पर बैंक जो अतिरिक्त राशि देता है, प्रतिशत में।',
    bho: 'ब्याज दर — हर साल जमा पर बैंक जे अतिरिक्त रकम देला, परसेंट में।',
    mai: 'ब्याज दर — प्रति वर्ष जमा पर बैंक जे अतिरिक्त राशि दैत अछि।',
    en: 'Interest rate — the annualised return the bank credits on the deposit, expressed as a percentage.',
    analogy: 'ज़मीन का किराया — हर साल मिलता है, मूल ज़मीन वैसी की वैसी।',
  },
  cumulative_fd: {
    hi: 'संचयी FD — ब्याज हर तिमाही जोड़ा जाता है पर मूलधन के साथ ही मैच्योरिटी पर मिलता है।',
    bho: 'क्यूम्युलेटिव FD — ब्याज हर तिमाही जुड़ेला बाकिर मैच्योरिटी पर एक संगे मिलेला।',
    mai: 'संचयी FD — ब्याज हर तिमाही जोड़ल जाइत अछि मुदा परिपक्वता पर एकहि बेर भेटैत अछि।',
    en: 'Cumulative FD — interest is compounded quarterly but paid out only at maturity along with principal.',
    analogy: 'गुल्लक — पैसे डालते रहो, अंत में एक बार में निकलता है।',
  },
  non_cumulative_fd: {
    hi: 'गैर-संचयी FD — ब्याज मासिक/त्रैमासिक नियमित रूप से खाते में आता है।',
    bho: 'नॉन-क्यूम्युलेटिव FD — ब्याज हर महीना/तिमाही खाता में आ जाला।',
    mai: 'गैर-संचयी FD — ब्याज नियमित रूप सं हर मास / तिमाही खाता में आबय अछि।',
    en: 'Non-cumulative FD — interest is paid out at regular intervals (monthly/quarterly), not compounded.',
    analogy: 'फलदार पेड़ — हर मौसम में फल देता रहता है।',
  },
  premature_withdrawal: {
    hi: 'समय से पहले निकासी — मैच्योरिटी से पहले FD तोड़ना। बैंक एक पेनल्टी काटता है।',
    bho: 'टाइम से पहिले निकासी — मैच्योरिटी से पहिले FD तोड़ल। बैंक थोड़ पेनल्टी काटे ला।',
    mai: 'समय सं पहिने निकासी — परिपक्वता सं पहिने FD तोड़ब। बैंक पेनल्टी कटैत अछि।',
    en: 'Premature withdrawal — breaking the FD before maturity. A penalty (typically 0.5–1%) is deducted.',
    analogy: 'कच्ची फसल काटना — मिलता तो है, पर कम।',
  },
  penalty: {
    hi: 'पेनल्टी — समय से पहले FD तोड़ने पर ब्याज दर पर 0.5% से 1% की कटौती।',
    bho: 'पेनल्टी — टाइम से पहिले FD तोड़े पर ब्याज में 0.5% से 1% कटौती।',
    mai: 'पेनल्टी — समय सं पहिने FD तोड़ला पर ब्याज दर पर 0.5%–1% कं कटौती।',
    en: 'Penalty — the deduction (typically 0.5–1%) applied to the booked rate when an FD is broken early.',
    analogy: 'जल्दी टिकट कैंसल करने पर सर्विस चार्ज।',
  },
  TDS: {
    hi: 'टीडीएस — स्रोत पर कर कटौती। बैंक ब्याज पर सीधे काटकर सरकार को देता है।',
    bho: 'टीडीएस — सोर्स पर टैक्स कटौती। बैंक ब्याज पर सीधे काटि के सरकार के देला।',
    mai: 'टीडीएस — स्रोत पर कर कटौती। बैंक ब्याज पर सीधे कटैत अछि।',
    en: 'TDS — Tax Deducted at Source. The bank withholds tax on FD interest and pays it to the government directly.',
    analogy: 'मज़दूरी से कुछ हिस्सा सरकार के पास सीधे चला जाता है।',
  },
  DICGC: {
    hi: 'DICGC — RBI की संस्था जो बैंक डूबने पर ₹5 लाख तक जमा वापस करती है।',
    bho: 'DICGC — RBI के संस्था जे बैंक डूबे पर ₹5 लाख तक पैसा वापस देला।',
    mai: 'DICGC — RBI कं संस्था जे बैंक डूबला पर ₹5 लाख तक जमा वापस दैत अछि।',
    en: "RBI's deposit insurance corporation. Guarantees up to ₹5L (principal + interest) per depositor per bank if the bank fails.",
    analogy: 'फसल बीमा — फसल बर्बाद हो तो सरकार देती है।',
  },
  small_finance_bank: {
    hi: 'स्मॉल फाइनेंस बैंक — RBI से लाइसेंस प्राप्त बैंक जो छोटे ग्राहकों पर केंद्रित होते हैं। पूरी तरह DICGC के तहत।',
    bho: 'स्मॉल फाइनेंस बैंक — RBI से लाइसेंस वाला बैंक जे छोट ग्राहक पर ध्यान देला। DICGC के तहत आवेला।',
    mai: 'लघु वित्त बैंक — RBI सं लाइसेंस प्राप्त बैंक जे छोट ग्राहक पर केंद्रित अछि।',
    en: 'Small Finance Bank — an RBI-licensed bank focused on underserved customers. Fully under DICGC coverage.',
    analogy: 'मोहल्ले की किराना दुकान — छोटी पर असली, और बीमा कवर वैसा ही।',
  },
  senior_citizen_rate: {
    hi: '60 वर्ष से अधिक के नागरिकों को FD पर 0.25%–0.75% अधिक ब्याज मिलता है।',
    bho: '60 साल से ऊपर के लोग के FD पर 0.25%–0.75% बेसी ब्याज मिलेला।',
    mai: '60 वर्ष सं ऊपर कें नागरिक कें FD पर 0.25%–0.75% बेसी ब्याज भेटैत अछि।',
    en: 'Senior citizen rate — residents aged 60+ get +25–75 bps over the regular FD rate; eligibility verified at booking.',
    analogy: 'बुजुर्गों के लिए ट्रेन में रिज़र्व सीट जैसा।',
  },
  auto_renewal: {
    hi: 'ऑटो रिन्यूअल — मैच्योरिटी पर FD खुद ही उसी अवधि के लिए नया हो जाता है।',
    bho: 'ऑटो रिन्यूअल — मैच्योरिटी पर FD अपने आप नया हो जाला।',
    mai: 'स्वतः नवीकरण — परिपक्वता पर FD स्वयं नवीन भ’ जाइत अछि।',
    en: 'Auto-renewal — at maturity the FD is automatically rebooked for the same tenor at the prevailing rate. Requires prior consent (RBI).',
    analogy: 'पत्रिका का सब्स्क्रिप्शन अपने आप अगले साल चालू हो जाता है।',
  },
  form_15G: {
    hi: 'फॉर्म 15G — 60 साल से कम उम्र के लोग जिनकी आमदनी टैक्सेबल नहीं है, यह भरकर TDS कटवाने से बच सकते हैं।',
    bho: 'फॉर्म 15G — 60 साल से कम उमर वाला, जेकर इनकम टैक्सेबल नइखे, ई फॉर्म भरि के TDS से बच सकेला।',
    mai: 'फार्म 15G — 60 वर्ष सं कम उम्र वाला जिनकर आमदनी कर योग्य नहि अछि, ई भरि कें TDS सं बचि सकैत छथि।',
    en: 'Form 15G — declaration by individuals under 60 with non-taxable income to request the bank not deduct TDS on FD interest.',
    analogy: 'जब आपको टैक्स नहीं देना तो बैंक को बता देते हैं।',
  },
  form_15H: {
    hi: 'फॉर्म 15H — 60 साल से अधिक के नागरिक जिनकी आमदनी टैक्सेबल नहीं है, यह भरकर TDS से बच सकते हैं।',
    bho: 'फॉर्म 15H — 60 साल से ऊपर के नागरिक, जेकर इनकम टैक्सेबल नइखे, ई फॉर्म भरि के TDS से बच सकेला।',
    mai: 'फार्म 15H — 60 वर्ष सं ऊपर कें नागरिक जिनकर आय कर-योग्य नहि अछि, TDS सं बचाव लेल भरि सकैत अछि।',
    en: 'Form 15H — same as 15G but for senior citizens (60+).',
    analogy: 'सीनियर वर्जन — 15G का बड़े उम्र वालों वाला रूप।',
  },
  tax_saver_FD: {
    hi: 'टैक्स सेवर FD — 5 साल लॉक-इन वाली FD जिसमें ₹1.5 लाख तक धारा 80C के तहत कर छूट मिलती है।',
    bho: 'टैक्स सेवर FD — 5 साल लॉक-इन वाला FD जेकरा में ₹1.5 लाख तक 80C में टैक्स छूट मिलेला।',
    mai: 'कर बचाओ FD — 5 वर्ष कं लॉक-इन वाला FD जाहि में ₹1.5 लाख धारा 80C कें अंतर्गत छूट भेटैत अछि।',
    en: 'Tax-saver FD — a 5-year lock-in FD eligible for deduction up to ₹1.5L under Section 80C. Premature withdrawal not permitted.',
    analogy: 'पाँच साल का बंद-कमरा-गुल्लक — टैक्स बचत के साथ।',
  },
  KYC: {
    hi: 'KYC — अपने ग्राहक को जानें। बैंक खाता खोलने या FD करने से पहले पहचान सत्यापन।',
    bho: 'KYC — आपन ग्राहक के जाने वाला प्रक्रिया। FD खातिर पहचान वेरीफाई करे के पड़ेला।',
    mai: 'KYC — अपन ग्राहक कें जानू कें प्रक्रिया। FD करय सं पहिने पहचान सत्यापन।',
    en: 'KYC — Know Your Customer. Mandatory identity verification before opening any deposit/account in India.',
    analogy: 'दुकान में राशन कार्ड दिखाना — पहचान दिखानी पड़ती है।',
  },
};

export function lookupTerm(term: string, language: Language = 'hi'): string | null {
  const key = Object.keys(glossary).find((k) => k.toLowerCase() === term.toLowerCase());
  if (!key) return null;
  const entry = glossary[key];
  const definition = (entry[language] as string | undefined) ?? entry.en;
  return language === 'en' ? definition : `${definition}\n\n💡 ${entry.analogy}`;
}

export function listTerms(): string[] {
  return Object.keys(glossary);
}
