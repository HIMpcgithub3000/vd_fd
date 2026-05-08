import type { Config } from 'tailwindcss';

/**
 * CSS-variable-driven palette so the existing app can flip between
 * light (default) and dark modes without rewriting every Tailwind class.
 *
 * Each scale shade reads from `rgb(var(--<color>-<n>) / <alpha-value>)`.
 * The actual RGB values are defined in `app/globals.css` for both
 * `:root` (light) and `:root.dark` (dark) themes.
 */
const palette = (name: string) => ({
  50: `rgb(var(--${name}-50) / <alpha-value>)`,
  100: `rgb(var(--${name}-100) / <alpha-value>)`,
  200: `rgb(var(--${name}-200) / <alpha-value>)`,
  300: `rgb(var(--${name}-300) / <alpha-value>)`,
  400: `rgb(var(--${name}-400) / <alpha-value>)`,
  500: `rgb(var(--${name}-500) / <alpha-value>)`,
  600: `rgb(var(--${name}-600) / <alpha-value>)`,
  700: `rgb(var(--${name}-700) / <alpha-value>)`,
  800: `rgb(var(--${name}-800) / <alpha-value>)`,
  900: `rgb(var(--${name}-900) / <alpha-value>)`,
  950: `rgb(var(--${name}-950) / <alpha-value>)`,
});

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './store/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        devanagari: ['"Noto Sans Devanagari"', 'Inter', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        slate: palette('slate'),
        indigo: palette('indigo'),
        amber: palette('amber'),
        emerald: palette('emerald'),
        red: palette('red'),
        yellow: palette('yellow'),
        green: palette('green'),
        violet: palette('violet'),
        rose: palette('rose'),
        brand: {
          50: '#eef2ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        vk: {
          navy: '#0c1222',
          ink: '#0f172a',
          saffron: '#f59e0b',
          saffronMuted: '#d97706',
          trust: '#1e3a5f',
        },
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        vkWave: {
          '0%, 100%': { height: '4px', opacity: '0.5' },
          '50%': { height: '18px', opacity: '1' },
        },
      },
      animation: {
        slideIn: 'slideIn 200ms ease-out',
        vkWave: 'vkWave 0.55s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
