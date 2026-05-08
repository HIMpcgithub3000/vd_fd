'use client';

import { useRouter } from 'next/navigation';
import { useAppStore, LANGUAGE_LABELS, type Language } from '@/store/app-store';
import { Languages } from 'lucide-react';
import { isDevanagari, t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const ORDER: Language[] = ['hi', 'bho', 'mai', 'en'];

export default function OnboardingPage() {
  const router = useRouter();
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const dev = isDevanagari(language);

  const choose = (lang: Language) => {
    setLanguage(lang);
    router.push('/chat');
  };

  return (
    <main
      className={cn(
        'flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-950 via-violet-950 to-slate-950 p-6',
        dev && 'devanagari',
      )}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 flex items-center justify-center">
          <div className="rounded-full border border-indigo-400/20 bg-indigo-500/10 p-3">
            <Languages className="h-6 w-6 text-indigo-300" />
          </div>
        </div>
        <h1 className="text-center text-3xl font-bold tracking-tight">
          {t('onboarding.title', language)}
        </h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          {t('onboarding.subtitle', language)}
        </p>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ORDER.map((lang) => {
            const meta = LANGUAGE_LABELS[lang];
            const langIsDevanagari = lang !== 'en';
            return (
              <button
                key={lang}
                onClick={() => choose(lang)}
                className="group flex flex-col items-start gap-1 rounded-xl border border-slate-700 bg-slate-950/50 p-5 text-left transition hover:border-indigo-400/60 hover:bg-indigo-500/10"
              >
                <span
                  className={cn(
                    'text-2xl font-semibold text-slate-100 group-hover:text-indigo-200',
                    langIsDevanagari && 'devanagari',
                  )}
                >
                  {meta.native}
                </span>
                <span className="text-xs text-slate-500">
                  {meta.english} · {meta.speakers} {t('onboarding.speakers', language)}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          {t('onboarding.footer', language)}
        </p>
      </div>
    </main>
  );
}
