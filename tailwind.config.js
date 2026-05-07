/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        'xs':  ['12px',   { lineHeight: '1.5' }],
        'sm':  ['13.5px', { lineHeight: '1.55' }],
        'base':['15px',   { lineHeight: '1.6' }],
        'lg':  ['17px',   { lineHeight: '1.55' }],
        'xl':  ['19px',   { lineHeight: '1.5' }],
        '2xl': ['22px',   { lineHeight: '1.4' }],
        '3xl': ['28px',   { lineHeight: '1.3' }],
        '4xl': ['34px',   { lineHeight: '1.2' }],
        '5xl': ['42px',   { lineHeight: '1.1' }],
        '6xl': ['52px',   { lineHeight: '1' }],
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#7c3aed',
          600: '#6d28d9',
          700: '#5b21b6',
          800: '#4c1d95',
          900: '#3b0764',
        },
      },
    },
  },
  plugins: [],
};
