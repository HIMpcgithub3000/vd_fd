'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Language } from '@/store/app-store';

const BCP47: Record<Language, string> = {
  hi: 'hi-IN',
  bho: 'hi-IN', // Bhojpuri ASR not widely supported; fall back to Hindi
  mai: 'hi-IN',
  mr: 'mr-IN',
  bn: 'bn-IN',
  as: 'as-IN', // limited browser support; falls back to Bengali if unavailable
  or: 'or-IN', // limited browser support
  gu: 'gu-IN',
  pa: 'pa-IN',
  ur: 'ur-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  en: 'en-IN',
};

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

type UseSpeechToTextResult = {
  isSupported: boolean;
  isRecording: boolean;
  transcript: string;
  start: () => void;
  stop: () => void;
  clear: () => void;
  error: string | null;
};

export function useSpeechToText(language: Language = 'hi'): UseSpeechToTextResult {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  /** Accumulated finalised speech for the current session; interim text is
   * appended on top of this for display but never written into it. */
  const finalsRef = useRef('');

  const isSupported =
    typeof window !== 'undefined' &&
    (typeof (window as any).SpeechRecognition !== 'undefined' ||
      typeof (window as any).webkitSpeechRecognition !== 'undefined');

  useEffect(() => {
    if (!isSupported) return;
    const Cls = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec: SpeechRecognitionInstance = new Cls();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = BCP47[language];

    rec.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const text: string = r[0]?.transcript ?? '';
        if (r.isFinal) {
          // Append the finalised segment to the running finals buffer
          // exactly once, keeping a single space between segments.
          finalsRef.current = (finalsRef.current
            ? finalsRef.current.trimEnd() + ' '
            : '') + text.trim();
        } else {
          interim += text;
        }
      }
      const display =
        finalsRef.current && interim
          ? `${finalsRef.current} ${interim}`.trim()
          : (finalsRef.current || interim).trim();
      setTranscript(display);
    };

    rec.onerror = (event: any) => {
      setError(event?.error || 'speech-recognition-error');
      setIsRecording(false);
    };
    rec.onend = () => setIsRecording(false);
    recognitionRef.current = rec;

    return () => {
      try {
        rec.abort();
      } catch {
        /* noop */
      }
      recognitionRef.current = null;
    };
  }, [isSupported, language]);

  const start = useCallback(() => {
    if (!recognitionRef.current) {
      setError('Speech recognition not available in this browser. Try Chrome.');
      return;
    }
    setError(null);
    setTranscript('');
    finalsRef.current = '';
    try {
      recognitionRef.current.start();
      setIsRecording(true);
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : 'failed-to-start';
      setError(m);
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  const clear = useCallback(() => {
    finalsRef.current = '';
    setTranscript('');
  }, []);

  return { isSupported, isRecording, transcript, start, stop, clear, error };
}
