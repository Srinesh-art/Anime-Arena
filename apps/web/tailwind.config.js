/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        arena: {
          bg: '#0a0d14',
          surface: '#121824',
          card: '#182133',
          border: '#24324a',
          accent: '#6366f1', // Indigo
          cyan: '#06b6d4',
          gold: '#eab308'
        }
      }
    },
  },
  plugins: [],
}
