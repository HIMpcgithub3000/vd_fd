'use client';

import { useEffect, useRef, useState } from 'react';
import { Settings2, Check } from 'lucide-react';
import type { Language } from '@/store/app-store';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { cn } from '@/lib/utils';

type Props = {
  language: Language;
};

/** Tiny popover that lets the user pick the TTS voice and adjust
 *  rate/pitch for the current language. Choices persist via localStorage
 *  inside `useTextToSpeech`. */
export default function VoicePicker({ language }: Props) {
  const tts = useTextToSpeech();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | undefined>();
  const ref = useRef<HTMLDivElement>(null);

  const options = tts.voiceOptionsFor(language);

  useEffect(() => {
    setSelected(tts.getPreferredVoiceName(language));
  }, [language, open, tts]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!tts.isSupported) return null;

  const pick = (name: string) => {
    tts.setPreferredVoice(language, name);
    setSelected(name);
  };

  const sample = () => {
    const samples: Partial<Record<Language, string>> = {
      hi: 'नमस्ते, मैं आपकी FD जानकारी का परीक्षण कर रहा हूँ।',
      bho: 'नमस्ते, हम परीक्षण कर रहल हईं।',
      mai: 'नमस्कार, हम परीक्षण कऽ रहल छी।',
      mr: 'नमस्कार, मी आवाज तपासत आहे.',
      bn: 'নমস্কার, আমি ভয়েস পরীক্ষা করছি।',
      gu: 'નમસ્તે, હું અવાજ ચકાસું છું.',
      pa: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ, ਮੈਂ ਆਵਾਜ਼ ਟੈਸਟ ਕਰ ਰਿਹਾ ਹਾਂ।',
      ta: 'வணக்கம், நான் குரலை சோதிக்கிறேன்.',
      te: 'నమస్కారం, నేను వాయిస్‌ను పరీక్షిస్తున్నాను.',
      kn: 'ನಮಸ್ಕಾರ, ನಾನು ಧ್ವನಿಯನ್ನು ಪರೀಕ್ಷಿಸುತ್ತಿದ್ದೇನೆ.',
      ml: 'നമസ്കാരം, ഞാൻ ശബ്ദം പരിശോധിക്കുന്നു.',
      ur: 'السلام علیکم، میں آواز جانچ رہا ہوں۔',
      en: 'Hello, this is a quick voice test for the Vernacular FD Advisor.',
    };
    tts.speak(samples[language] ?? samples.en!, language);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Voice settings"
        aria-label="Voice settings"
        className={cn(
          'inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs font-medium text-slate-200',
          'hover:border-indigo-400/50 hover:bg-indigo-500/10',
        )}
      >
        <Settings2 className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 z-30 mb-2 w-72 rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Voice ({options.length} available)
          </p>

          {options.length === 0 ? (
            <p className="rounded-md border border-amber-700/40 bg-amber-950/40 p-2 text-xs leading-relaxed text-amber-200">
              No system voice installed for this language. Use Chrome or install
              the language pack for crisper output.
            </p>
          ) : (
            <ul className="max-h-44 overflow-y-auto pr-1">
              {options.map((o) => {
                const active = selected === o.name;
                return (
                  <li key={o.name}>
                    <button
                      type="button"
                      onClick={() => pick(o.name)}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs',
                        active
                          ? 'bg-indigo-500/15 text-indigo-200'
                          : 'text-slate-300 hover:bg-slate-800',
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{o.name}</span>
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-slate-500">
                        {o.lang}
                        {!o.isLocal && ' · cloud'}
                      </span>
                      {active && <Check className="h-3 w-3 text-indigo-300" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Speed: <span className="text-slate-200">{tts.rate.toFixed(2)}×</span>
            </label>
            <input
              type="range"
              min={0.6}
              max={1.4}
              step={0.05}
              value={tts.rate}
              onChange={(e) => tts.setRate(parseFloat(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Pitch: <span className="text-slate-200">{tts.pitch.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min={0.7}
              max={1.5}
              step={0.05}
              value={tts.pitch}
              onChange={(e) => tts.setPitch(parseFloat(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <button
              type="button"
              onClick={sample}
              className="mt-1 w-full rounded-md border border-indigo-500/40 bg-indigo-500/10 py-1.5 text-xs font-medium text-indigo-200 hover:bg-indigo-500/20"
            >
              🔊 Test voice
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
