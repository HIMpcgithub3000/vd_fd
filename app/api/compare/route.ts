import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { inArray } from 'drizzle-orm';

import { rag, type PolicyFact } from '@/lib/rag-client';
import { db } from '@/lib/db';
import { compareSessions, fdPolicies } from '@/lib/schema';
import type { Language } from '@/lib/prompts';

export const runtime = 'nodejs';
export const maxDuration = 90;

const Body = z.object({
  query: z.string().min(2),
  policies: z
    .array(
      z.object({
        id: z.string(),
        bankName: z.string(),
        faissSessionId: z.string().nullable(),
      }),
    )
    .min(2)
    .max(4),
  language: z
    .enum(['hi', 'bho', 'mai', 'mr', 'bn', 'as', 'or', 'gu', 'pa', 'ur', 'ta', 'te', 'kn', 'ml', 'en'])
    .default('hi'),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: 'bad-request', details: e?.message }, { status: 400 });
  }

  // We allow policies without an indexed FAISS session — those banks will
  // be answered purely from their seeded `fd_policies` rate-card row (passed
  // as `policyFacts`). Use a sentinel session id that the backend treats as
  // "no FAISS retrieval, synthetic source only".
  const NO_INDEX_SENTINEL = '__rate_card_only__';
  const sessionIds = body.policies.map(
    (p) => p.faissSessionId ?? NO_INDEX_SENTINEL,
  );
  const policyNames = body.policies.map((p) => p.bankName);

  if (sessionIds.length < 2) {
    return NextResponse.json(
      { error: 'too-few-policies', message: 'Pick at least 2 banks to compare.' },
      { status: 400 },
    );
  }

  // Look up the seeded rate-card row for every policy id at once.
  // The backend will turn each row into a synthetic [Source N] block so a
  // bank without an indexed brochure still gets a grounded answer instead
  // of the "I could not find a reliable answer" decline.
  const requestedIds = body.policies.map((p) => p.id);
  let policyRows: Array<typeof fdPolicies.$inferSelect> = [];
  try {
    policyRows = await db
      .select()
      .from(fdPolicies)
      .where(inArray(fdPolicies.id, requestedIds));
  } catch (e) {
    console.warn('[compare] could not fetch fd_policies; falling back to FAISS-only', e);
  }

  const policyFacts: Array<PolicyFact | null> = body.policies.map((p) => {
    const row = policyRows.find((r) => r.id === p.id);
    if (!row) return null;
    return {
      bank_name: row.bankName,
      bank_type: row.bankType,
      rate_regular: row.rateRegular,
      rate_senior: row.rateSenior,
      min_deposit: row.minDeposit,
      premature_penalty: row.prematurePenalty,
      dicgc_covered: row.dicgcCovered,
      rbi_licensed: row.rbiLicensed,
      tax_saver_available: row.taxSaverAvailable,
      notes: row.notes,
    };
  });

  try {
    const result = await rag.compare({
      query: body.query,
      policySessionIds: sessionIds,
      policyNames,
      language: body.language as Language,
      policyFacts,
    });

    // Persist for analytics — non-blocking failure ok.
    if (process.env.DATABASE_URL) {
      db.insert(compareSessions)
        .values({
          userId,
          policyIds: body.policies.map((p) => p.id),
          query: body.query,
          results: result as any,
          summary: result.comparisonSummary,
          language: body.language,
        })
        .catch((e) => console.error('[compare] persist failed', e));
    }

    return NextResponse.json(result);
  } catch (e: any) {
    console.error('[compare] failed', e);
    return NextResponse.json(
      { error: 'compare-failed', message: e?.message ?? 'Unknown error' },
      { status: 502 },
    );
  }
}
