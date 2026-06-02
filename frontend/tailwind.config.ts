import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ─── Dulcerie tokens ───────────────────────────────────────────
        cream: {
          DEFAULT: '#F9F6F1',
          dark: '#F0EBE3',
        },
        ink: {
          DEFAULT: '#1A1714',
          light: '#6B6560',
          lighter: '#A8A29C',
        },
        accent: {
          DEFAULT: '#C4956A',
          light: '#EDD9C5',
        },
        // ─── Legacy (panel admin) ──────────────────────────────────────
        primary: {
          50: '#fef3f2', 100: '#ffe4e1', 200: '#ffcdc8', 300: '#ffa9a1',
          400: '#ff766a', 500: '#f74c3a', 600: '#e42e1c', 700: '#c02313',
          800: '#9f2013', 900: '#832217',
        },
        secondary: {
          50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047',
          400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207',
          800: '#854d0e', 900: '#713f12',
        },
      },
      fontFamily: {
        serif: ['var(--font-cormorant)', 'Georgia', 'serif'],
        sans:  ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        wide2: '0.06em',
        wider2: '0.10em',
        widest2: '0.18em',
      },
    },
  },
  plugins: [],
};

export default config;
