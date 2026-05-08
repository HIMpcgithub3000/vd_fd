import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { z } from 'zod';

import { rag } from '@/lib/rag-client';
import type { Language } from '@/lib/prompts';

export const runtime = 'nodejs';

const Body = z.object({
  query: z.string().min(1),
  sessionIds: z.array(z.string()).min(1),
  language: z
    .enum(['hi', 'bho', 'mai', 'mr', 'bn', 'as', 'or', 'gu', 'pa', 'ur', 'ta', 'te', 'kn', 'ml', 'en'])
    .default('hi'),
  topK: z.number().int().min(1).max(20).default(5),
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

  try {
    const result = await rag.retrieve({
      query: body.query,
      sessionIds: body.sessionIds,
      language: body.language as Language,
      topK: body.topK,
    });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { error: 'retrieve-failed', message: e?.message ?? 'Unknown error' },
      { status: 502 },
    );
  }
}
