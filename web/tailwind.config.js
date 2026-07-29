/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          bg: '#030712',
          surface: '#0B1220',
          elevated: '#111827',
          border: 'rgba(148,163,184,0.16)',
          primary: '#F8FAFC',
          secondary: '#94A3B8',
          muted: '#64748B',
          blue: '#3B82F6',
          cyan: '#22D3EE',
          emerald: '#10B981',
          violet: '#8B5CF6',
          amber: '#F59E0B',
          red: '#F87171'
        }
      }
    },
  },
  plugins: [],
}
