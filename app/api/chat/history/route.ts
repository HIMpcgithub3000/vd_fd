import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';

import { db } from '@/lib/db';
import { sessions, messages } from '@/lib/schema';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId');

  if (sessionId) {
    const rows = await db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(messages.createdAt);
    return NextResponse.json({ messages: rows });
  }

  const rows = await db
    .select({
      id: sessions.id,
      title: sessions.title,
      language: sessions.language,
      updatedAt: sessions.updatedAt,
    })
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.updatedAt))
    .limit(50);

  return NextResponse.json({ sessions: rows });
}
