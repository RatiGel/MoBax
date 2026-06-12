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
        primary: { DEFAULT: '#1E2D5A', dark: '#162247', light: '#2A3F7A' },
        accent: { DEFAULT: '#F5A623', dark: '#D4891A', light: '#FBBF4A' },
        surface: { light: '#FFFFFF', dark: '#1A2540' },
        background: { light: '#FAFAF8', dark: '#0F1624' },
        success: '#16A34A',
        error: '#DC2626',
        'border-light': '#E5E7EB',
        'border-dark': '#2A3A5C',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        georgian: ['"BPG Nino Mtavruli"', '"Noto Sans Georgian"', 'sans-serif'],
      },
      animation: {
        'slide-down': 'slideDown 0.18s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
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
      },
    },
  },
  plugins: [],
};

export default config;
