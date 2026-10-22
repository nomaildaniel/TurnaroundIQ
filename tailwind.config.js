/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4fa',
          100: '#d9e2ef',
          200: '#b3c5df',
          300: '#7d9cc7',
          400: '#4a6ba0',
          500: '#2d4a7d',
          600: '#1e3a64',
          700: '#15294a',
          800: '#0e1d36',
          900: '#0a1528',
          950: '#060d1c',
        },
        cyan: {
          50: '#eefbfb',
          100: '#cbf5f5',
          200: '#99ebeb',
          300: '#5fdbdb',
          400: '#2cc4c4',
          500: '#0da8a8',
          600: '#088585',
          700: '#0a6868',
          800: '#0e5454',
          900: '#114848',
        },
        accent: {
          400: '#f59e0b',
          500: '#d97706',
        },
        success: {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
        warning: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        danger: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
        'pulse-slow': 'pulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
