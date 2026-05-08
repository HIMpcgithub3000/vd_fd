import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { streamText, createDataStreamResponse, type CoreMessage } from 'ai';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import { ollama, OLLAMA_MODEL } from '@/lib/ollama';
import { rag } from '@/lib/rag-client';
import { getSystemPrompt, type Language } from '@/lib/prompts';
import { advisorTools } from '@/lib/tools';
import { db } from '@/lib/db';
import { sessions, messages, fdPolicies } from '@/lib/schema';
import type { MessageSource } from '@/lib/schema';
import {
  classifyIntent,
  getRetrievalPlan,
  outOfScopeMessage,
  EMPATHY_SYSTEM_ADDON,
} from '@/lib/intent-router';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

const CONFIDENCE_GATE = 0.2;
const MIN_SUPPORTING_SOURCES = 2;

const GATED_DECLINE: Record<string, string> = {
  hi: 'मुझे इस प्रश्न का उत्तर उपलब्ध दस्तावेज़ों में नहीं मिला। कृपया अपने बैंक से सीधे पूछें।',
  bho: 'हमके इ सवाल के जवाब मौजूद कागज़ में नहीं मिलल। सीधे बैंक से पूछीं।',
  mai: 'एहि प्रश्नक उत्तर उपलब्ध दस्तावेज़मे नहि भेटल। बैंकसँ सीधे पुष्टि करी।',
  mr: 'या प्रश्नाचे विश्वसनीय उत्तर उपलब्ध कागदपत्रांत मला सापडले नाही. कृपया आपल्या बँकेशी थेट संपर्क साधा.',
  bn: 'এই প্রশ্নের নির্ভরযোগ্য উত্তর উপলব্ধ নথিগুলিতে আমি খুঁজে পাইনি। অনুগ্রহ করে সরাসরি আপনার ব্যাংকের সঙ্গে যোগাযোগ করুন।',
  as: 'এই প্ৰশ্নৰ নিৰ্ভৰযোগ্য উত্তৰ উপলব্ধ নথি-পত্ৰত মই বিচাৰি পোৱা নাছিলোঁ। অনুগ্ৰহ কৰি পোনপটীয়াকৈ আপোনাৰ বেংকৰ সৈতে যোগাযোগ কৰক।',
  or: 'ଏହି ପ୍ରଶ୍ନର ଭରସାଯୋଗ୍ୟ ଉତ୍ତର ଉପଲବ୍ଧ ଡକ୍ୟୁମେଣ୍ଟରେ ମୁଁ ପାଇଲି ନାହିଁ। ଦୟାକରି ସିଧାସଳଖ ଆପଣଙ୍କ ବ୍ୟାଙ୍କ ସହିତ ଯୋଗାଯୋଗ କରନ୍ତୁ।',
  gu: 'આ પ્રશ્નનો વિશ્વાસપાત્ર જવાબ ઉપલબ્ધ દસ્તાવેજોમાં મને મળ્યો નથી. કૃપા કરીને સીધા તમારી બેંકનો સંપર્ક કરો.',
  pa: 'ਇਸ ਸਵਾਲ ਦਾ ਭਰੋਸੇਯੋਗ ਜਵਾਬ ਉਪਲਬਧ ਦਸਤਾਵੇਜ਼ਾਂ ਵਿੱਚ ਨਹੀਂ ਮਿਲਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਸਿੱਧੇ ਆਪਣੇ ਬੈਂਕ ਨਾਲ ਸੰਪਰਕ ਕਰੋ।',
  ur: 'دستیاب دستاویزات میں مجھے اس سوال کا قابلِ اعتماد جواب نہیں ملا۔ براہ کرم براہِ راست اپنے بینک سے رابطہ کریں۔',
  ta: 'கிடைக்கின்ற ஆவணங்களில் இந்தக் கேள்விக்கான நம்பகமான பதில் எனக்குக் கிடைக்கவில்லை. தயவுசெய்து நேரடியாக உங்கள் வங்கியைத் தொடர்புகொள்ளவும்.',
  te: 'అందుబాటులో ఉన్న పత్రాలలో ఈ ప్రశ్నకు నమ్మదగిన సమాధానం నాకు దొరకలేదు. దయచేసి నేరుగా మీ బ్యాంక్‌ను సంప్రదించండి.',
  kn: 'ಈ ಪ್ರಶ್ನೆಗೆ ವಿಶ್ವಾಸಾರ್ಹ ಉತ್ತರ ಲಭ್ಯವಿರುವ ದಾಖಲೆಗಳಲ್ಲಿ ನನಗೆ ಸಿಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ನೇರವಾಗಿ ನಿಮ್ಮ ಬ್ಯಾಂಕನ್ನು ಸಂಪರ್ಕಿಸಿ.',
  ml: 'ലഭ്യമായ രേഖകളിൽ ഈ ചോദ്യത്തിന്‌ വിശ്വസനീയമായ ഉത്തരം എനിക്ക് കണ്ടെത്താനായില്ല. ദയവായി നേരിട്ട് നിങ്ങളുടെ ബാങ്കിനെ സമീപിക്കുക.',
  en: 'I could not find a reliable answer in the available documents. Please contact your bank directly.',
};

function relayStream(
  assistantPlainText: string,
  onDone: (text: string) => void | Promise<void>,
) {
  return streamText({
    model: ollama(OLLAMA_MODEL),
    messages: [
      {
        role: 'system',
        content:
          'Copy the user message below verbatim as your entire assistant reply. Do not add quotes, preamble, or extra sentences.',
      },
      { role: 'user', content: assistantPlainText },
    ],
    temperature: 0,
    maxTokens: 600,
    onFinish: async ({ text }) => {
      await onDone(text);
    },
  });
}

const COMPLIANCE_PATTERNS: Array<{ code: string; re: RegExp }> = [
  {
    code: 'V4_GUARANTEED',
    re: /\b(guaranteed|100\s*%\s*safe|no\s+risk|completely\s+safe|bilkul\s+safe|pura\s+safe)\b/gi,
  },
  {
    code: 'V7_PRESSURE',
    re: /\b(limited\s+time|act\s+now|only\s+today|abhi\s+karein|jaldi\s+karein)\b/gi,
  },
  {
    code: 'V9_PROFANITY',
    re: new RegExp(
      [
        // Devanagari profanity tokens (variants)
        'हरामज़?ाद[ेाीो]',
        'हराम[ीि]',
        'कमीन[ेाी]',
        'गा[णन]्?डू',
        'मादरचोद',
        'बहनचोद',
        'भेनचोद',
        'भोसड़?ीके',
        'भोसड़?ी',
        'चूतिय[ाेो]',
        'रंडी',
        'साला',
        'साली',
        // Transliterated / English
        '\\bharamzaad[ae]\\b',
        '\\bharamzad[ae]\\b',
        '\\bharami\\b',
        '\\bkamine\\b',
        '\\bgandu\\b',
        '\\bmadarchod\\b',
        '\\bbehenchod\\b',
        '\\bbhenchod\\b',
        '\\bbsdk\\b',
        '\\bbhosdike\\b',
        '\\bchutiya[ah]?\\b',
        '\\brandi\\b',
        '\\bsaala\\b',
        '\\bf+u+c+k+\\b',
        '\\bshit\\b',
        '\\bbastard\\b',
      ].join('|'),
      'gi',
    ),
  },
];

function applyComplianceV4(text: string, language: string): string {
  let redacted = text;
  const violations: string[] = [];
  for (const { code, re } of COMPLIANCE_PATTERNS) {
    re.lastIndex = 0;
    if (re.test(redacted)) {
      violations.push(code);
      re.lastIndex = 0;
      redacted = redacted.replace(re, '');
    }
  }
  if (violations.length === 0) return text;
  console.warn('[COMPLIANCE FAIL]', { language, violations });
  redacted = redacted
    .replace(/^[\s,;:।!?.\-]+/, '')
    .replace(/[ \t]*([,;:।])\s*\1/g, '$1')
    .replace(/\s+([,;:।!?.])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const disclaimer: Record<string, string> = {
    hi: '\n\n⚠️ नोट: यह जानकारी केवल शैक्षिक उद्देश्य के लिए है।',
    bho: '\n\n⚠️ नोट: ई जानकारी सिरिफ पढ़े-लिखे खातिर बा।',
    mai: '\n\n⚠️ नोट: ई जानकारी शैक्षिक उद्देश्य लेल अछि।',
    mr: '\n\n⚠️ टीप: ही माहिती फक्त शैक्षणिक उद्देशासाठी आहे.',
    bn: '\n\n⚠️ দ্রষ্টব্য: এই তথ্য কেবলমাত্র শিক্ষাগত উদ্দেশ্যে।',
    as: '\n\n⚠️ মন্তব্য: এই তথ্য কেৱল শৈক্ষিক উদ্দেশ্যৰ বাবে।',
    or: '\n\n⚠️ ଟିପ୍ପଣୀ: ଏହି ତଥ୍ୟ କେବଳ ଶିକ୍ଷାଗତ ଉଦ୍ଦେଶ୍ୟ ପାଇଁ।',
    gu: '\n\n⚠️ નોંધ: આ માહિતી ફક્ત શૈક્ષણિક હેતુ માટે છે.',
    pa: '\n\n⚠️ ਨੋਟ: ਇਹ ਜਾਣਕਾਰੀ ਸਿਰਫ਼ ਵਿੱਦਿਅਕ ਉਦੇਸ਼ ਲਈ ਹੈ।',
    ur: '\n\n⚠️ نوٹ: یہ معلومات صرف تعلیمی مقصد کے لیے ہیں۔',
    ta: '\n\n⚠️ குறிப்பு: இந்தத் தகவல் கல்வி நோக்கிற்கு மட்டுமே.',
    te: '\n\n⚠️ గమనిక: ఈ సమాచారం విద్యా ప్రయోజనం కోసం మాత్రమే.',
    kn: '\n\n⚠️ ಸೂಚನೆ: ಈ ಮಾಹಿತಿಯು ಶೈಕ್ಷಣಿಕ ಉದ್ದೇಶಕ್ಕಾಗಿ ಮಾತ್ರ.',
    ml: '\n\n⚠️ കുറിപ്പ്: ഈ വിവരം വിദ്യാഭ്യാസ ഉദ്ദേശ്യത്തിന് മാത്രം.',
    en: '\n\n⚠️ Note: For educational purposes only. Please confirm with your bank.',
  };
  return `${redacted}${disclaimer[language] ?? disclaimer.en}`;
}

function appendMaturityFormula(
  text: string,
  steps: Array<{ toolResults?: unknown[] }> | undefined,
): string {
  if (!steps?.length) return text;
  let out = text;
  for (const step of steps) {
    for (const tr of (step.toolResults ?? []) as Array<{
      toolName: string;
      result: { formula_shown?: string; computation_note?: string };
    }>) {
      if (tr.toolName !== 'calculate_maturity') continue;
      const r = tr.result;
      if (r?.formula_shown) {
        out += `\n\n📐 Deterministic calculation\n\`${r.formula_shown}\`\n${r.computation_note ?? ''}`;
      }
    }
  }
  return out;
}

const BodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
      }),
    )
    .min(1),
  language: z
    .enum(['hi', 'bho', 'mai', 'mr', 'bn', 'as', 'or', 'gu', 'pa', 'ur', 'ta', 'te', 'kn', 'ml', 'en'])
    .default('hi'),
  kbSessionIds: z.array(z.string()).default([]),
  sessionId: z.string().uuid().optional(),
  topK: z.number().int().min(1).max(20).default(5),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: 'bad-request', details: e?.message }, { status: 400 });
  }

  const { messages: chatMessages, language, kbSessionIds, topK } = body;
  const lastUser = [...chatMessages].reverse().find((m) => m.role === 'user');
  const userQuery = lastUser?.content ?? '';

  const intent = classifyIntent(userQuery);
  const plan = getRetrievalPlan(intent, kbSessionIds, topK);

  if (plan.skip) {
    const scopeText = outOfScopeMessage(language);
    return createDataStreamResponse({
      execute: (dataStream) => {
        dataStream.writeData({ type: 'sources', sources: [] });
        dataStream.writeData({ type: 'response_kind', kind: 'out_of_scope' });
        const result = relayStream(scopeText, async (text) => {
          await persistTurn({
            userId,
            language,
            kbSessionIds,
            userQuery,
            assistantText: applyComplianceV4(text, language),
            sources: [],
            sessionId: body.sessionId,
            forceLowConfidence: true,
          });
        });
        result.mergeIntoDataStream(dataStream);
      },
      onError(err) {
        console.error('[chat] stream error', err);
        return 'Server error while generating response.';
      },
    });
  }

  let rawSources: Awaited<ReturnType<typeof rag.retrieve>>['sources'] = [];
  let retrievalMeta: Awaited<ReturnType<typeof rag.retrieve>>['meta'] | undefined;
  try {
    if (plan.sessions.length > 0 && userQuery.trim()) {
      const r = await rag.retrieve({
        query: userQuery,
        sessionIds: plan.sessions,
        language: language as Language,
        topK: plan.topK,
      });
      rawSources = r.sources;
      retrievalMeta = r.meta;
    }
  } catch (e) {
    console.error('[chat] retrieval failed', e);
  }

  const rateCardBlocks = await buildRateCardBlocks(userQuery, rawSources.length);
  let retrievalSources: MessageSource[] = [...rawSources, ...rateCardBlocks];

  const nonSynth = retrievalSources.filter((s) => s.faissSessionId !== 'rate_card_db');
  const bestNonSynth =
    nonSynth.length > 0 ? Math.max(...nonSynth.map((s) => s.score)) : 0;
  const retrievalGated =
    nonSynth.length > 0 &&
    bestNonSynth < CONFIDENCE_GATE &&
    nonSynth.length < MIN_SUPPORTING_SOURCES;

  if (retrievalGated) {
    const decline = GATED_DECLINE[language] ?? GATED_DECLINE.en;
    return createDataStreamResponse({
      execute: (dataStream) => {
        dataStream.writeData({ type: 'sources', sources: retrievalSources as any });
        dataStream.writeData({ type: 'response_kind', kind: 'gated' });
        if (retrievalMeta) {
          dataStream.writeData({
            type: 'retrieval_meta',
            meta: { ...retrievalMeta, gated: true, gateReason: 'low-confidence' } as any,
          });
        }
        const result = relayStream(decline, async (text) => {
          await persistTurn({
            userId,
            language,
            kbSessionIds,
            userQuery,
            assistantText: applyComplianceV4(text, language),
            sources: retrievalSources,
            sessionId: body.sessionId,
            forceLowConfidence: true,
          });
        });
        result.mergeIntoDataStream(dataStream);
      },
      onError(err) {
        console.error('[chat] stream error', err);
        return 'Server error while generating response.';
      },
    });
  }

  // Detect mixed-script queries (e.g. Hindi-mode user typing Hinglish:
  // "FD पर kitna interest milega?"). Soften the LANGUAGE LOCK so the model
  // doesn't force pure-Devanagari onto a Hinglish-native user.
  const hasDevanagari = /[\u0900-\u097F]/.test(userQuery);
  const hasLatin = (userQuery.match(/[A-Za-z]/g)?.length ?? 0) >= 4;
  const mixedScript = language === 'hi' && hasDevanagari && hasLatin;

  let systemPrompt = getSystemPrompt(language as Language, retrievalSources, {
    mixedScript,
  });
  if (plan.prependEmpathy) {
    systemPrompt = `${systemPrompt}\n\n${EMPATHY_SYSTEM_ADDON}`;
  }

  const coreMessages: CoreMessage[] = [
    { role: 'system', content: systemPrompt },
    ...chatMessages.map((m) => ({ role: m.role, content: m.content }) as CoreMessage),
  ];

  return createDataStreamResponse({
    execute: (dataStream) => {
      dataStream.writeData({ type: 'sources', sources: retrievalSources as any });
      dataStream.writeData({ type: 'response_kind', kind: 'normal' });
      if (retrievalMeta) {
        dataStream.writeData({
          type: 'retrieval_meta',
          meta: retrievalMeta as any,
        });
      }

      const result = streamText({
        model: ollama(OLLAMA_MODEL),
        messages: coreMessages,
        tools: advisorTools,
        temperature: 0.1,
        maxTokens: 1000,
        maxSteps: 6,
        onFinish: async ({ text, steps }) => {
          try {
            let finalText = text;
            finalText = appendMaturityFormula(finalText, steps);
            finalText = applyComplianceV4(finalText, language);
            await persistTurn({
              userId,
              language,
              kbSessionIds,
              userQuery,
              assistantText: finalText,
              sources: retrievalSources,
              sessionId: body.sessionId,
            });
          } catch (err) {
            console.error('[chat] persist failed', err);
          }
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError(err) {
      console.error('[chat] stream error', err);
      return 'Server error while generating response.';
    },
  });
}

async function persistTurn(args: {
  userId: string;
  language: string;
  kbSessionIds: string[];
  userQuery: string;
  assistantText: string;
  sources: Awaited<ReturnType<typeof rag.retrieve>>['sources'];
  sessionId?: string;
  forceLowConfidence?: boolean;
}) {
  if (!process.env.DATABASE_URL) return;

  let sessionId = args.sessionId;
  if (!sessionId) {
    const [created] = await db
      .insert(sessions)
      .values({
        userId: args.userId,
        title: args.userQuery.slice(0, 60) || 'नई बातचीत',
        language: args.language,
        kbSessionIds: args.kbSessionIds,
      })
      .returning({ id: sessions.id });
    sessionId = created.id;
  } else {
    await db
      .update(sessions)
      .set({ updatedAt: new Date(), kbSessionIds: args.kbSessionIds })
      .where(eq(sessions.id, sessionId));
  }

  const confidence = args.forceLowConfidence
    ? 'low'
    : args.sources.length === 0
      ? 'low'
      : Math.max(...args.sources.map((s) => s.score)) >= 0.8
        ? 'high'
        : 'medium';

  await db.insert(messages).values([
    {
      sessionId,
      role: 'user',
      content: args.userQuery,
      sources: [],
      confidence: 'medium',
    },
    {
      sessionId,
      role: 'assistant',
      content: args.assistantText,
      sources: args.sources.map((s) => ({
        index: s.index,
        doc: s.doc,
        page: s.page,
        score: s.score,
        faissSessionId: s.faissSessionId,
        chunkText: s.chunkText,
      })),
      confidence,
    },
  ]);
}

// ---------------------------------------------------------------------------
// Rate-card injection
// ---------------------------------------------------------------------------

type CachedPolicy = {
  bankName: string;
  bankType: string;
  rateRegular: number;
  rateSenior: number;
  minDeposit: number;
  prematurePenalty: number;
  dicgcCovered: boolean;
  rbiLicensed: boolean;
  taxSaverAvailable: boolean;
  notes: string | null;
  /** Trigger phrases (lower-cased / Devanagari). A user query is matched
   *  against these as plain substrings — keeps the user's Hindi (e.g.
   *  "सूर्योदय") wired to the English bank name in the rate-card DB. */
  triggers: string[];
};

/**
 * Devanagari / Hinglish aliases keyed by canonical bank name. Lower-cased
 * Latin tokens are derived automatically from the bank name itself.
 */
const DEVANAGARI_ALIASES: Record<string, string[]> = {
  SBI: ['एसबीआई', 'भारतीय स्टेट बैंक', 'स्टेट बैंक'],
  'HDFC Bank': ['एचडीएफसी'],
  'ICICI Bank': ['आईसीआईसीआई'],
  'Axis Bank': ['एक्सिस'],
  'Suryoday SFB': ['सूर्योदय', 'सूर्यदय'],
  'Ujjivan SFB': ['उज्जीवन', 'उजीवन'],
  'ESAF SFB': ['ईसैफ', 'इसाफ', 'ईसाफ'],
};

let policyCache: { at: number; rows: CachedPolicy[] } | null = null;
const POLICY_CACHE_TTL_MS = 60_000;

async function loadPolicies(): Promise<CachedPolicy[]> {
  const now = Date.now();
  if (policyCache && now - policyCache.at < POLICY_CACHE_TTL_MS) {
    return policyCache.rows;
  }
  if (!process.env.DATABASE_URL) return [];
  try {
    const rows = await db.select().from(fdPolicies);
    const cached: CachedPolicy[] = rows.map((r) => {
      const lc = r.bankName.toLowerCase();
      const firstToken = lc.split(/\s+/)[0] ?? '';
      const dev = DEVANAGARI_ALIASES[r.bankName] ?? [];
      const triggers = Array.from(
        new Set([lc, firstToken, ...dev].filter((t) => t && t.length >= 2)),
      );
      return {
        bankName: r.bankName,
        bankType: r.bankType,
        rateRegular: Number(r.rateRegular),
        rateSenior: Number(r.rateSenior),
        minDeposit: r.minDeposit,
        prematurePenalty: Number(r.prematurePenalty),
        dicgcCovered: r.dicgcCovered,
        rbiLicensed: r.rbiLicensed,
        taxSaverAvailable: r.taxSaverAvailable,
        notes: r.notes,
        triggers,
      };
    });
    policyCache = { at: now, rows: cached };
    return cached;
  } catch (e) {
    console.error('[chat] policy lookup failed', e);
    return [];
  }
}

function formatRateCardChunk(p: CachedPolicy): string {
  const lines: string[] = [
    `${p.bankName} (${p.bankType}) — official rate-card`,
    `• Regular FD interest rate: ${p.rateRegular.toFixed(2)}% per annum`,
    `• Senior-citizen FD rate: ${p.rateSenior.toFixed(2)}% per annum`,
    `• Premature-withdrawal penalty: ${p.prematurePenalty.toFixed(2)}%`,
    `• Minimum deposit: ₹${p.minDeposit.toLocaleString('en-IN')}`,
    `• DICGC insured: ${p.dicgcCovered ? 'Yes (₹5 lakh per depositor per bank)' : 'No'}`,
    `• RBI licensed: ${p.rbiLicensed ? 'Yes' : 'No'}`,
    `• Tax-saver FD (5-year, §80C): ${p.taxSaverAvailable ? 'Yes' : 'No'}`,
  ];
  if (p.notes) lines.push(`• Notes: ${p.notes}`);
  return lines.join('\n');
}

async function buildRateCardBlocks(
  userQuery: string,
  startIndex: number,
): Promise<MessageSource[]> {
  if (!userQuery.trim()) return [];
  const policies = await loadPolicies();
  if (policies.length === 0) return [];

  const lowered = userQuery.toLowerCase();
  const seen = new Set<string>();
  const matches: CachedPolicy[] = [];
  for (const p of policies) {
    // Latin triggers compare against lower-cased query; Devanagari triggers
    // compare against the raw query (case-folding doesn't apply to
    // Devanagari, and lower-casing the user query does not corrupt the
    // Devanagari runes — but matching the original keeps things explicit).
    const hit = p.triggers.some((trig) => {
      if (/^[\x00-\x7F]+$/.test(trig)) return lowered.includes(trig);
      return userQuery.includes(trig);
    });
    if (hit) {
      if (seen.has(p.bankName)) continue;
      seen.add(p.bankName);
      matches.push(p);
    }
  }
  if (matches.length === 0) return [];

  return matches.map((p, i) => ({
    index: startIndex + i + 1,
    doc: `${p.bankName} rate-card`,
    page: 1,
    score: 1.0,
    faissSessionId: 'rate_card_db',
    chunkText: formatRateCardChunk(p),
  }));
}
