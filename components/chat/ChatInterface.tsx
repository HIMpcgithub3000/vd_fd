'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from 'ai/react';
import { Menu, IndianRupee } from 'lucide-react';

import { useAppStore, RETRIEVAL_TOP_K } from '@/store/app-store';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { isDevanagari, t } from '@/lib/i18n';
import CitedMessageBubble from './CitedMessageBubble';
import SourceDrawer from './SourceDrawer';
import AdvisorSidebar from './AdvisorSidebar';
import ChatEmptyState from './ChatEmptyState';
import VoiceWaveform from './VoiceWaveform';
import ThemeToggle from '@/components/ui/ThemeToggle';
import TextSizeToggle from '@/components/ui/TextSizeToggle';
import HiEnToggle from '@/components/ui/HiEnToggle';
import type { MessageSource } from '@/lib/schema';
import type { RetrievalMeta } from '@/lib/rag-client';
import type { ToolInvocation } from 'ai';
import { cn } from '@/lib/utils';

type ResponseKind = 'normal' | 'gated' | 'out_of_scope' | null;

/** Read `?q=` (pre-fill input) and `?voice=1` (start mic) from the URL once on
 *  mount. Used by the landing page's example-question chips to deep-link
 *  straight into the chat with the question already typed. */
function readChatLaunchParams(): { q: string | null; voice: boolean } {
  if (typeof window === 'undefined') return { q: null, voice: false };
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      q: params.get('q'),
      voice: params.get('voice') === '1',
    };
  } catch {
    return { q: null, voice: false };
  }
}

const FOLLOWUPS_BY_LANG: Record<string, string[]> = {
  hi: [
    'प्रीमेच्योर withdrawal पर पेनल्टी क्या है?',
    'Senior citizen को कितना अतिरिक्त ब्याज मिलता है?',
    'TDS कब कटेगा? Form 15G कैसे भरें?',
  ],
  bho: [
    'समय से पहिले FD तोड़े पर कतना घाटा?',
    'सीनियर सिटिज़न के बेसी ब्याज मिलेला?',
    'TDS कब कटेला?',
  ],
  mai: [
    'समय सं पहिने FD तोड़ब त कि?',
    'वरिष्ठ नागरिक केँ बेसी ब्याज भेटैत अछि?',
    'TDS कखन कटैत अछि?',
  ],
  en: [
    'How does premature withdrawal work?',
    'What extra rate do senior citizens get?',
    'When is TDS deducted? How to file 15G?',
  ],
};

export default function ChatInterface() {
  const language = useAppStore((s) => s.language);
  const selectedKbSessions = useAppStore((s) => s.selectedKbSessions);
  const setKnownKbDocuments = useAppStore((s) => s.setKnownKbDocuments);

  const dev = isDevanagari(language);

  const [drawer, setDrawer] = useState<{ open: boolean; source: MessageSource | null }>({
    open: false,
    source: null,
  });
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [responseKind, setResponseKind] = useState<ResponseKind>(null);

  const lastUserQueryRef = useRef('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const stt = useSpeechToText(language);

  const { messages, input, setInput, handleInputChange, handleSubmit, isLoading, data } = useChat({
    api: '/api/chat',
    body: { language, kbSessionIds: selectedKbSessions, topK: RETRIEVAL_TOP_K },
    maxSteps: 6,
  });

  const lastSources = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return [];
    for (let i = data.length - 1; i >= 0; i--) {
      const d = data[i] as { type?: string; sources?: MessageSource[] };
      if (d?.type === 'sources' && Array.isArray(d.sources)) return d.sources;
    }
    return [];
  }, [data]);

  const lastRetrievalMeta = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    for (let i = data.length - 1; i >= 0; i--) {
      const d = data[i] as { type?: string; meta?: RetrievalMeta };
      if (d?.type === 'retrieval_meta' && d.meta) return d.meta;
    }
    return null;
  }, [data]);

  useEffect(() => {
    if (!data || !Array.isArray(data)) return;
    for (let i = data.length - 1; i >= 0; i--) {
      const d = data[i] as { type?: string; kind?: string };
      if (d?.type === 'response_kind') {
        setResponseKind((d.kind as ResponseKind) ?? 'normal');
        return;
      }
    }
  }, [data]);

  useEffect(() => {
    fetch('/api/discover')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.kbDocuments)) setKnownKbDocuments(d.kbDocuments);
      })
      .catch(() => {});
  }, [setKnownKbDocuments]);

  // Pre-fill from landing-page example chips (?q=…) and optionally start the
  // mic (?voice=1). Runs once on mount.
  useEffect(() => {
    const { q, voice } = readChatLaunchParams();
    if (q) setInput(q);
    if (voice && stt.isSupported && !stt.isRecording) {
      // small delay so the textarea + permission prompt feel sequenced
      const id = window.setTimeout(() => stt.start(), 300);
      return () => window.clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (stt.transcript) setInput(stt.transcript);
  }, [stt.transcript, setInput]);

  const followups = FOLLOWUPS_BY_LANG[language] ?? FOLLOWUPS_BY_LANG.en;

  const onFormSubmit = (e: React.FormEvent) => {
    if (input.trim()) lastUserQueryRef.current = input.trim();
    setResponseKind(null);
    handleSubmit(e);
  };

  const statusLine =
    selectedKbSessions.length === 0
      ? t('status.noSources', language)
      : t('status.activeSources', language, {
          count: selectedKbSessions.length,
          // `k` is still passed for backward-compat with older translations
          // that referenced it; current chrome strings no longer use it.
          k: RETRIEVAL_TOP_K,
          lang: language.toUpperCase(),
        });

  return (
    <main className="flex h-[100dvh] overflow-hidden bg-slate-950 text-slate-100">
      {/* Desktop sidebar */}
      <aside className="hidden w-[min(100%,20rem)] shrink-0 md:flex md:flex-col">
        <AdvisorSidebar />
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[min(100%,20rem)] transition-transform duration-200 md:hidden',
          mobileSidebar ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <AdvisorSidebar onCloseMobile={() => setMobileSidebar(false)} />
      </div>
      {mobileSidebar && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          aria-label={t('drawer.close', language)}
          onClick={() => setMobileSidebar(false)}
        />
      )}

      <section className="flex min-w-0 flex-1 flex-col bg-gradient-to-b from-slate-950 via-slate-950 to-vk-navy/40">
        {/* Header */}
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-800/90 bg-slate-950/90 px-3 py-2.5 backdrop-blur sm:px-5">
          <button
            type="button"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-700 bg-slate-900 md:hidden touch-manipulation"
            onClick={() => setMobileSidebar(true)}
            aria-label={t('status.menu', language)}
          >
            <Menu className="h-5 w-5 text-slate-200" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <IndianRupee className="hidden h-5 w-5 text-amber-500/90 sm:block" strokeWidth={1.5} />
              <h1 className="truncate text-sm font-semibold text-slate-100 sm:text-base">
                <span className={cn(dev && 'devanagari')}>पैसा सहायक</span>
                {dev && (
                  <span className="ml-1.5 text-[11px] font-normal text-slate-500 sm:text-xs">
                    · Money Assistant
                  </span>
                )}
                <span className="ml-2 text-slate-500">·</span>
                <span
                  className={cn(
                    'ml-2 text-xs font-normal text-slate-400 sm:text-sm',
                    dev && 'devanagari',
                  )}
                >
                  {t('brand.subtitle', language)}
                </span>
              </h1>
            </div>
            <p
              className={cn(
                'truncate text-[11px] text-slate-500 sm:text-xs',
                dev && 'devanagari',
              )}
            >
              {statusLine}
            </p>
          </div>

          <HiEnToggle className="hidden md:inline-flex" />
          <TextSizeToggle />
          <ThemeToggle />
        </header>

        {/* Messages */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {messages.length === 0 && (
              <ChatEmptyState language={language} onPick={(q) => setInput(q)} />
            )}

            {messages.map((m, idx) => {
              const isLast = idx === messages.length - 1;
              const sources = m.role === 'assistant' && isLast ? lastSources : [];
              const confidence = inferConfidence(sources);
              const toolInvocations = (m as { toolInvocations?: ToolInvocation[] }).toolInvocations;
              const rk =
                m.role === 'assistant' && isLast ? responseKind ?? 'normal' : 'normal';
              const meta =
                m.role === 'assistant' && isLast ? lastRetrievalMeta : null;
              return (
                <CitedMessageBubble
                  key={m.id}
                  role={m.role === 'assistant' ? 'assistant' : 'user'}
                  content={m.content}
                  sources={sources}
                  confidence={confidence}
                  language={language}
                  isStreaming={isLoading && isLast && m.role === 'assistant'}
                  onCitationClick={(s) => setDrawer({ open: true, source: s })}
                  toolInvocations={toolInvocations}
                  responseKind={rk}
                  retrievalMeta={meta}
                />
              );
            })}

            {messages.length > 0 && !isLoading && (
              <div className="flex flex-wrap gap-2">
                {followups.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setInput(q)}
                    className={cn(
                      'min-h-[44px] rounded-full border border-slate-600/90 bg-slate-900/60 px-4 py-2 text-left text-xs text-slate-200 transition hover:border-amber-500/35 hover:bg-indigo-950/40 touch-manipulation',
                      dev && 'devanagari',
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {messages.length > 0 && (
              <p
                className={cn(
                  'text-center text-[10px] leading-relaxed text-slate-600',
                  dev && 'devanagari',
                )}
              >
                {t('chat.disclaimer', language)}
              </p>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <form
          onSubmit={onFormSubmit}
          className="shrink-0 border-t border-slate-800/90 bg-slate-950/95 p-3 backdrop-blur sm:p-4"
        >
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-2xl border border-slate-700/90 bg-slate-900/80 p-2 shadow-inner shadow-black/20 focus-within:border-indigo-500/40 focus-within:ring-1 focus-within:ring-indigo-500/20">
              <div className="flex shrink-0 flex-col items-center gap-0.5 pl-1">
                <button
                  type="button"
                  onClick={() => (stt.isRecording ? stt.stop() : stt.start())}
                  disabled={!stt.isSupported}
                  className={cn(
                    'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition touch-manipulation',
                    !stt.isSupported && 'cursor-not-allowed opacity-40',
                    stt.isSupported &&
                      !stt.isRecording &&
                      'text-slate-300 hover:bg-slate-800 hover:text-amber-400',
                    stt.isRecording && 'bg-amber-500/20 text-amber-300 ring-2 ring-amber-500/40',
                  )}
                  title={
                    stt.isRecording
                      ? t('chat.stopVoice', language)
                      : t('chat.startVoice', language)
                  }
                >
                  {stt.isRecording ? (
                    <span className="text-lg">⏹</span>
                  ) : (
                    <span className="text-xl" aria-hidden>
                      🎤
                    </span>
                  )}
                </button>
                <VoiceWaveform active={stt.isRecording} />
              </div>
              <textarea
                rows={1}
                value={input}
                onChange={handleInputChange}
                placeholder={t('chat.placeholder', language)}
                className={cn(
                  'min-h-[48px] flex-1 resize-none bg-transparent py-3 text-base leading-relaxed text-slate-100 outline-none placeholder:text-slate-500 sm:text-[17px]',
                  dev && 'devanagari',
                )}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onFormSubmit(e as unknown as React.FormEvent);
                  }
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="mb-1 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 px-4 text-sm font-semibold text-white shadow-md shadow-indigo-900/30 transition hover:from-indigo-400 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 touch-manipulation"
              >
                {isLoading ? '…' : '⬆'}
              </button>
            </div>
            {stt.error && <p className="mt-2 text-xs text-rose-400">⚠️ {stt.error}</p>}
            <p
              className={cn(
                'mt-2 text-center text-[10px] text-slate-600',
                dev && 'devanagari',
              )}
            >
              {t('chat.voiceHint', language)}
            </p>
          </div>
        </form>
      </section>

      <SourceDrawer
        open={drawer.open}
        source={drawer.source}
        onClose={() => setDrawer({ open: false, source: null })}
        highlightQuery={lastUserQueryRef.current}
      />
    </main>
  );
}

function inferConfidence(sources: MessageSource[]): 'low' | 'medium' | 'high' {
  if (sources.length === 0) return 'low';
  const top = Math.max(...sources.map((s) => s.score));
  if (top >= 0.8) return 'high';
  if (top >= 0.6) return 'medium';
  return 'low';
}
