import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* storefront semantic palette — neutral-led + single cobalt accent */
        ink: '#0A0A0B',
        paper: '#FBFBFA',
        cloud: { light: '#F1F1EF', dark: '#1C1C1F' },
        /* Secondary text. Driven by a CSS var so it tracks the theme: the old
           hardcoded #6B6B70 stayed identical in dark mode and failed WCAG AA
           (~3.2-3.7:1 on ink) everywhere it was used. */
        graphite: 'rgb(var(--graphite) / <alpha-value>)',
        /* Brand tokens reference CSS-var RGB channels so the admin Theme page
           can override them live at runtime (see app/globals.css + lib/theme.ts).
           `<alpha-value>` keeps opacity modifiers (bg-cobalt/10) working. */
        cobalt: {
          DEFAULT: 'rgb(var(--cobalt) / <alpha-value>)',
          dark: 'rgb(var(--cobalt-dark) / <alpha-value>)',
          soft: 'rgb(var(--cobalt-soft) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          dark: 'rgb(var(--primary-dark) / <alpha-value>)',
          light: 'rgb(var(--primary-light) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          dark: 'rgb(var(--accent-dark) / <alpha-value>)',
          light: 'rgb(var(--accent-light) / <alpha-value>)',
        },
        surface: { light: '#FFFFFF', dark: '#141416' },
        background: { light: '#FBFBFA', dark: '#0A0A0B' },
        success: '#30A46C',
        error: '#E5484D',
        'border-light': '#E8E8E5',
        'border-dark': '#262629',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        georgian: ['"BPG Nino Mtavruli"', '"Noto Sans Georgian"', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'slide-down': 'slideDown 0.18s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-up': 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        slideDown: {
          '0%': { transform: 'translateY(-6px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
