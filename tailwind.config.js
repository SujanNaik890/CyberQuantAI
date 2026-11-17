/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        grid: {
          darkest: '#030712',
          bg: '#050b14',
          panel: '#070e1b',
          border: '#1e293b',
          card: '#0c1527',
          cyan: '#38bdf8',
          indigo: '#818cf8',
          amber: '#f59e0b',
          emerald: '#10b981',
          crimson: '#f43f5e',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
