/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        industrial: {
          bg: '#0B132B',
          card: '#1C2541',
          surface: '#1E293B',
          border: '#334155',
          accent: '#00F0FF',
          accentMuted: '#38BDF8',
          normal: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          insufficient: '#64748B'
        }
      }
    },
  },
  plugins: [],
}
