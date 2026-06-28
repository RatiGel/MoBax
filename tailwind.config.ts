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
        graphite: '#6B6B70',
        cobalt: { DEFAULT: '#2E5BFF', dark: '#5C7CFF', soft: '#EAF0FF' },
        /* legacy tokens — admin panel still references these */
        primary: { DEFAULT: '#1E2D5A', dark: '#162247', light: '#2A3F7A' },
        accent: { DEFAULT: '#2E5BFF', dark: '#5C7CFF', light: '#EAF0FF' },
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
