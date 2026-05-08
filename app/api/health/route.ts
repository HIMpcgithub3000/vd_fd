import { NextResponse } from 'next/server';
import { rag } from '@/lib/rag-client';

export const runtime = 'nodejs';

export async function GET() {
  let backend: { status: string; ollama: string } = { status: 'unknown', ollama: 'unknown' };
  try {
    backend = await rag.health();
  } catch {
    backend = { status: 'unreachable', ollama: 'unknown' };
  }
  return NextResponse.json({
    nextjs: 'ok',
    backend: backend.status,
    ollama: backend.ollama,
    time: new Date().toISOString(),
  });
}
