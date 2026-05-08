import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Proxies multipart upload to the FastAPI RAG backend (keeps RAG_API_KEY server-side).
 */
export async function POST(req: Request) {
  await auth();

  const base = (process.env.RAG_BACKEND_URL ?? 'http://localhost:8000').replace(/\/$/, '');
  const key = process.env.RAG_API_KEY ?? 'vfd-advisor-internal-2024';

  const incoming = await req.formData();

  const res = await fetch(`${base}/api/ingest`, {
    method: 'POST',
    headers: { 'X-API-Key': key },
    body: incoming,
  });

  const text = await res.text();
  if (!res.ok) {
    return NextResponse.json({ error: 'ingest-failed', detail: text }, { status: res.status });
  }

  try {
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json({ raw: text });
  }
}
