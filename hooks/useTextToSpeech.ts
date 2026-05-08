'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Language } from '@/store/app-store';

const BCP47: Record<Language, string> = {
  hi: 'hi-IN',
  bho: 'hi-IN',
  mai: 'hi-IN',
  mr: 'mr-IN',
  bn: 'bn-IN',
  as: 'as-IN',
  or: 'or-IN',
  gu: 'gu-IN',
  pa: 'pa-IN',
  ur: 'ur-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  en: 'en-IN',
};

const VOICE_PREF_KEY_PREFIX = 'vfd-tts-voice-';
const RATE_KEY = 'vfd-tts-rate';
const PITCH_KEY = 'vfd-tts-pitch';

/** Default speech parameters tuned for clarity (sharp, easily understood
 *  while still natural). Users can override via the settings popover. */
const DEFAULT_RATE = 1.0;
const DEFAULT_PITCH = 1.05;
const DEFAULT_VOLUME = 1.0;

/** Score a voice by perceived quality. Higher = better.
 *
 *  Heuristics (browser-supplied voice metadata is uneven, so we look at the
 *  voice name for vendor / quality hints):
 *   - "Natural" / "Neural" → Microsoft Neural / Edge premium voices
 *   - "Premium" / "Enhanced"  → Apple Premium voices
 *   - "Google ..."            → Google's cloud voices (very clear)
 *   - localService=true       → Generally lower quality system voices,
 *                               but reliable. We rank these last unless they
 *                               are explicitly tagged premium.
 */
function scoreVoice(v: SpeechSynthesisVoice, targetLang: string): number {
  const name = v.name.toLowerCase();
  let s = 0;

  // Exact locale match (e.g. hi-IN === hi-IN)
  if (v.lang.toLowerCase() === targetLang.toLowerCase()) s += 100;
  else if (v.lang.toLowerCase().split('-')[0] === targetLang.split('-')[0]) s += 60;
  else return -1; // wrong language entirely

  // Vendor / quality hints
  if (name.includes('natural')) s += 50; // Microsoft "Aria Online (Natural)", "Heera Online (Natural)"
  if (name.includes('neural')) s += 50;
  if (name.includes('premium')) s += 45;
  if (name.includes('enhanced')) s += 40;
  if (name.includes('online')) s += 35; // cloud voices are usually higher quality
  if (name.startsWith('google')) s += 30;
  if (name.startsWith('microsoft')) s += 25;
  // Apple desktop voices: Lekha (hi-IN), Veena (en-IN), Rishi (en-IN), etc.
  if (
    name.includes('lekha') ||
    name.includes('veena') ||
    name.includes('rishi') ||
    name.includes('isha') ||
    name.includes('aaditya')
  ) {
    s += 20;
  }

  // Penalise old robotic system voices
  if (name.includes('compact')) s -= 30;
  if (name.includes('eloquence')) s -= 40;

  return s;
}

function pickBestVoice(
  voices: SpeechSynthesisVoice[],
  bcp47: string,
  preferredName?: string,
): SpeechSynthesisVoice | undefined {
  if (preferredName) {
    const match = voices.find((v) => v.name === preferredName);
    if (match) return match;
  }
  const ranked = voices
    .map((v) => ({ v, score: scoreVoice(v, bcp47) }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score);
  if (ranked.length > 0) return ranked[0].v;
  // Last-resort fallback: any voice in the same primary language
  const prefix = bcp47.split('-')[0];
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ||
    voices.find((v) => v.lang.toLowerCase().startsWith('en'))
  );
}

export type VoiceOption = {
  name: string;
  lang: string;
  isLocal: boolean;
};

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [rate, setRateState] = useState<number>(DEFAULT_RATE);
  const [pitch, setPitchState] = useState<number>(DEFAULT_PITCH);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    setIsSupported(true);

    // Restore tuned rate / pitch
    const r = parseFloat(window.localStorage.getItem(RATE_KEY) ?? '');
    const p = parseFloat(window.localStorage.getItem(PITCH_KEY) ?? '');
    if (!Number.isNaN(r) && r >= 0.5 && r <= 1.5) setRateState(r);
    if (!Number.isNaN(p) && p >= 0.5 && p <= 2) setPitchState(p);

    const refresh = () => {
      const list = window.speechSynthesis.getVoices();
      if (list.length) setVoices(list);
    };
    refresh();
    // Chrome populates voices asynchronously
    window.speechSynthesis.onvoiceschanged = refresh;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const setRate = useCallback((r: number) => {
    setRateState(r);
    try {
      window.localStorage.setItem(RATE_KEY, String(r));
    } catch {
      /* private mode */
    }
  }, []);

  const setPitch = useCallback((p: number) => {
    setPitchState(p);
    try {
      window.localStorage.setItem(PITCH_KEY, String(p));
    } catch {
      /* private mode */
    }
  }, []);

  /** Voices the user is allowed to pick for `language`. Sorted best-first. */
  const voiceOptionsFor = useCallback(
    (language: Language): VoiceOption[] => {
      const target = BCP47[language];
      const ranked = voices
        .map((v) => ({ v, score: scoreVoice(v, target) }))
        .filter((x) => x.score >= 0)
        .sort((a, b) => b.score - a.score);
      return ranked.map((x) => ({
        name: x.v.name,
        lang: x.v.lang,
        isLocal: x.v.localService,
      }));
    },
    [voices],
  );

  const getPreferredVoiceName = useCallback(
    (language: Language): string | undefined => {
      try {
        return (
          window.localStorage.getItem(VOICE_PREF_KEY_PREFIX + language) ?? undefined
        );
      } catch {
        return undefined;
      }
    },
    [],
  );

  const setPreferredVoice = useCallback((language: Language, name: string) => {
    try {
      window.localStorage.setItem(VOICE_PREF_KEY_PREFIX + language, name);
    } catch {
      /* private mode */
    }
  }, []);

  const speak = useCallback(
    (text: string, language: Language = 'hi') => {
      if (!isSupported) return;
      const synth = window.speechSynthesis;
      synth.cancel();

      const stripped = stripCitations(text);
      if (!stripped) return;
      const utter = new SpeechSynthesisUtterance(stripped);
      utter.lang = BCP47[language];
      utter.rate = rate;
      utter.pitch = pitch;
      utter.volume = DEFAULT_VOLUME;
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);

      const list = voices.length ? voices : synth.getVoices();
      const preferred = pickBestVoice(
        list,
        BCP47[language],
        getPreferredVoiceName(language),
      );
      if (preferred) utter.voice = preferred;

      setIsSpeaking(true);
      synth.speak(utter);
    },
    [isSupported, voices, rate, pitch, getPreferredVoiceName],
  );

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  return useMemo(
    () => ({
      isSpeaking,
      isSupported,
      speak,
      stop,
      voiceOptionsFor,
      getPreferredVoiceName,
      setPreferredVoice,
      rate,
      pitch,
      setRate,
      setPitch,
    }),
    [
      isSpeaking,
      isSupported,
      speak,
      stop,
      voiceOptionsFor,
      getPreferredVoiceName,
      setPreferredVoice,
      rate,
      pitch,
      setRate,
      setPitch,
    ],
  );
}

function stripCitations(text: string): string {
  return text
    .replace(/\[स्रोत\s*\d+\]/g, '')
    .replace(/\[Source\s*\d+\]/g, '')
    .replace(/\[உৎस\s*\d+\]/g, '')
    .replace(/\[ఉৎস\s*\d+\]/g, '')
    .replace(/\[ਸਰੋਤ\s*\d+\]/g, '')
    .replace(/\[ਸ੍ਰੋਤ\s*\d+\]/g, '')
    .replace(/\[સ્રોત\s*\d+\]/g, '')
    .replace(/\[ਮੂਲ\s*\d+\]/g, '')
    .replace(/\[ಮೂಲ\s*\d+\]/g, '')
    .replace(/\[మూలం\s*\d+\]/g, '')
    .replace(/\[ஆதாரம்\s*\d+\]/g, '')
    .replace(/\[ഉറവിടം\s*\d+\]/g, '')
    .replace(/\[ਉତ୍ସ\s*\d+\]/g, '')
    .replace(/\[ଉତ୍ସ\s*\d+\]/g, '')
    .replace(/\[ماخذ\s*\d+\]/g, '')
    .replace(/\[উৎস\s*\d+\]/g, '')
    // Remove any markdown asterisks/underscores so they aren't read aloud
    .replace(/[*_`]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
