'use client';

import { cn } from '@/lib/utils';

/** Simple listening animation — no Web Audio API required (mobile-friendly). */
export default function VoiceWaveform({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        'flex h-8 items-end justify-center gap-0.5 px-1',
        !active && 'opacity-30',
      )}
      aria-hidden
    >
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={cn(
            'w-1 rounded-full bg-amber-400/90',
            active && 'animate-vkWave',
          )}
          style={
            active
              ? ({ animationDelay: `${i * 0.08}s` } as React.CSSProperties)
              : { height: '4px' }
          }
        />
      ))}
    </div>
  );
}
