import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import { db } from '@/lib/db';
import { fdPolicies, kbDocuments } from '@/lib/schema';

export const runtime = 'nodejs';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const policiesRows = await db.select().from(fdPolicies);
  const kbRows = await db.select().from(kbDocuments);

  const policies = policiesRows.map((p) => ({
    id: p.id,
    bankName: p.bankName,
    bankType: p.bankType,
    rateRegular: Number(p.rateRegular),
    rateSenior: Number(p.rateSenior),
    minDeposit: p.minDeposit,
    prematurePenalty: Number(p.prematurePenalty),
    dicgcCovered: p.dicgcCovered,
    faissSessionId: p.faissSessionId,
  }));

  const kbDocumentsList = kbRows.map((d) => ({
    faissSessionId: d.faissSessionId,
    title: d.title,
    source: d.source,
    category: d.category,
    language: d.language,
  }));

  return NextResponse.json({ policies, kbDocuments: kbDocumentsList });
}
