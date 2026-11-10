/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: '#08090B',
        ink: '#0A0C0F',
        surface: '#101318',
        raised: '#151A21',
        line: {
          DEFAULT: '#22262E',
          strong: '#2E343E',
        },
        chalk: '#F3F0E8',
        smoke: '#A9A69D',
        ash: '#77746C',
        gold: {
          DEFAULT: '#E7B36A',
          soft: '#F1C98F',
          deep: '#B9873F',
        },
        success: '#7FC8A0',
        warning: '#E7A75E',
        critical: '#E27C6D',
        // Compatibility aliases used by older class names.
        border: '#22262E',
        primary: '#F3F0E8',
        secondary: '#A9A69D',
        muted: '#77746C',
        accent: {
          gold: '#E7B36A',
          goldHover: '#F1C98F',
        },
        'surface-base': '#101318',
        'surface-elevated': '#151A21',
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
        display: ['Instrument Serif', 'Georgia', 'serif'],
      },
      borderRadius: {
        sm: '7px',
        md: '10px',
        lg: '14px',
        xl: '18px',
        '2xl': '22px',
      },
      boxShadow: {
        card: 'inset 0 1px 0 0 rgba(255,255,255,0.035), 0 18px 40px -24px rgba(0,0,0,0.75)',
        pop: '0 32px 80px -24px rgba(0,0,0,0.8)',
        glow: '0 0 0 1px rgba(231,179,106,0.16), 0 24px 60px -24px rgba(231,179,106,0.16)',
        'gold-inset': 'inset 0 1px 0 0 rgba(255,255,255,0.28)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'translate(-50%, -48%) scale(0.97)' },
          to: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
        'sweep': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(200%)' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(-14px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 420ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'scale-in': 'scale-in 180ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'toast-in': 'toast-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        sweep: 'sweep 1.6s ease-in-out infinite',
        'slide-in': 'slide-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};
