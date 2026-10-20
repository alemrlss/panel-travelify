/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Escala violeta de la marca personal, tomada literal de
        // salidas/web-alejandro-morales/tailwind.config.js.
        brand: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        // Tokens del panel (dark mode fijo). ink = texto, hairline = bordes;
        // se usan con opacidad (text-ink/60, border-hairline/10).
        ink: 'rgb(var(--ink-rgb) / <alpha-value>)',
        surface: 'rgb(var(--surface-rgb) / <alpha-value>)',
        card: 'rgb(var(--card-rgb) / <alpha-value>)',
        elevated: 'rgb(var(--elevated-rgb) / <alpha-value>)',
        hairline: 'rgb(var(--hairline-rgb) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-montserrat)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgb(0 0 0 / 0.4), 0 8px 24px -12px rgb(0 0 0 / 0.6)',
        lift: '0 0 0 1px rgb(139 92 246 / 0.25), 0 12px 32px -12px rgb(124 58 237 / 0.35)',
        glow: '0 0 0 1px rgb(139 92 246 / 0.4), 0 8px 24px -8px rgb(124 58 237 / 0.6)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
