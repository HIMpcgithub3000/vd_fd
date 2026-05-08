import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const base = (process.env.RAG_BACKEND_URL ?? 'http://localhost:8000').replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/api/insights`, { cache: 'no-store' });
    const json = await res.json();
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json(
      { key_insight: 'Transaction data unavailable.', error: String(e) },
      { status: 200 },
    );
  }
}
