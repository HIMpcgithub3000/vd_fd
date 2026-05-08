'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Loader2, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isDevanagari, t } from '@/lib/i18n';
import type { Language } from '@/store/app-store';

export type UploadResult = {
  sessionId: string;
  title: string;
  chunkCount: number;
};

type Props = {
  onIndexed: (result: UploadResult) => void;
  language: Language;
};

type Status =
  | { kind: 'idle' }
  | { kind: 'busy'; fileName: string }
  | { kind: 'success'; fileName: string; chunks: number }
  | { kind: 'error'; message: string };

export default function DocumentUploadPanel({ onIndexed, language }: Props) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const dev = isDevanagari(language);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-collapse the success card after a few seconds so the panel doesn't
  // look stale next time the user comes back.
  useEffect(() => {
    if (status.kind !== 'success') return;
    successTimer.current = setTimeout(() => setStatus({ kind: 'idle' }), 6000);
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, [status]);

  const upload = useCallback(
    async (file: File) => {
      if (!file.name.match(/\.(pdf|txt|md|markdown)$/i)) {
        setStatus({ kind: 'error', message: t('upload.errType', language) });
        return;
      }
      const title = file.name.replace(/\.[^.]+$/, '');
      setStatus({ kind: 'busy', fileName: file.name });

      const sessionId = `kb_upload_${Date.now().toString(36)}`;
      const fd = new FormData();
      fd.append('file', file);
      fd.append('session_id', sessionId);
      fd.append('doc_title', title);

      try {
        const res = await fetch('/api/ingest', { method: 'POST', body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const detail =
            (typeof data?.detail === 'string' && data.detail) ||
            (typeof data?.error === 'string' && data.error) ||
            `HTTP ${res.status}`;
          setStatus({ kind: 'error', message: detail });
          return;
        }
        const finalSessionId: string = data.session_id ?? sessionId;
        const chunkCount: number = Number(data.chunk_count) || 0;
        onIndexed({ sessionId: finalSessionId, title, chunkCount });
        setStatus({ kind: 'success', fileName: file.name, chunks: chunkCount });
      } catch (e: unknown) {
        const m = e instanceof Error ? e.message : 'Network error';
        setStatus({ kind: 'error', message: m });
      }
    },
    [language, onIndexed],
  );

  const busy = status.kind === 'busy';

  return (
    <div className="space-y-2">
      <label
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-600/80 bg-slate-950/40 px-3 py-4 transition hover:border-amber-500/40 hover:bg-slate-900/60',
          busy && 'pointer-events-none opacity-60',
        )}
      >
        <input
          type="file"
          accept=".pdf,.txt,.md,.markdown"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void upload(f);
          }}
        />
        {busy ? (
          <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
        ) : (
          <Upload className="h-6 w-6 text-slate-500" />
        )}
        <span
          className={cn(
            'mt-2 text-center text-[11px] leading-snug text-slate-400',
            dev && 'devanagari',
          )}
        >
          {t('upload.dropPrimary', language)}
        </span>
        <span className={cn('text-[10px] text-slate-600', dev && 'devanagari')}>
          {t('upload.dropSecondary', language)}
        </span>
      </label>

      {status.kind === 'busy' && (
        <div
          className={cn(
            'flex items-start gap-2 rounded-md border border-indigo-500/30 bg-indigo-950/30 px-2.5 py-2 text-[11px] leading-snug text-indigo-100',
            dev && 'devanagari',
          )}
        >
          <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-indigo-300" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{t('upload.busyTitle', language)}</p>
            <p className="truncate text-indigo-300/80" title={status.fileName}>
              {status.fileName}
            </p>
          </div>
        </div>
      )}

      {status.kind === 'success' && (
        <div
          className={cn(
            'flex items-start gap-2 rounded-md border border-emerald-500/35 bg-emerald-950/30 px-2.5 py-2 text-[11px] leading-snug text-emerald-100',
            dev && 'devanagari',
          )}
        >
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t('upload.successTitle', language)}</p>
            <p className="truncate text-emerald-200/90" title={status.fileName}>
              {status.fileName}
            </p>
            <p className="mt-0.5 text-emerald-300/80">
              {t('upload.indexedChunks', language)}
            </p>
          </div>
        </div>
      )}

      {status.kind === 'error' && (
        <div
          className={cn(
            'flex items-start gap-2 rounded-md border border-rose-500/40 bg-rose-950/30 px-2.5 py-2 text-[11px] leading-snug text-rose-100',
            dev && 'devanagari',
          )}
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t('upload.errorTitle', language)}</p>
            <p className="truncate text-rose-200/90">{status.message}</p>
          </div>
        </div>
      )}

      {status.kind === 'idle' && (
        <p
          className={cn(
            'flex items-start gap-1 text-[10px] leading-snug text-slate-600',
            dev && 'devanagari',
          )}
        >
          <FileText className="mt-0.5 h-3 w-3 shrink-0 text-slate-700" />
          {t('upload.hint', language)}
        </p>
      )}
    </div>
  );
}
