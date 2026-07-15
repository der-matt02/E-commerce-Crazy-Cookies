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
        // ─── Dulcerie tokens (rediseño 1a) ─────────────────────────────
        bg: '#FAF9F5',
        surface: '#FFFFFF',
        cream: {
          DEFAULT: '#FAF9F5',
          dark: '#F0ECE3',
        },
        ink: {
          DEFAULT: '#1A1714',
          light: '#736B62',
          lighter: '#A39A8E',
        },
        secondary: '#736B62',
        border: {
          DEFAULT: '#E8E2D8',
          md: '#D9D0C2',
        },
        accent: {
          DEFAULT: '#C4956A',
          dark: '#A97748',
          light: '#EDD9C5',
        },
        success: {
          DEFAULT: '#7C8F6B',
          dark: '#65775A',
        },
        error: {
          DEFAULT: '#B24B3C',
          dark: '#943D30',
        },
        whatsapp: '#3FA34D',
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        card: '0 2px 16px rgba(26, 23, 20, 0.07)',
      },
      fontFamily: {
        serif: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        sans:  ['var(--font-inter)', 'system-ui', 'sans-serif'],
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
