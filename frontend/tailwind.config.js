/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0F172A',      // Slate 900
          card: '#1E293B',    // Slate 800
          border: '#334155',  // Slate 700
          hover: '#475569'    // Slate 600
        },
        brand: {
          green: '#10B981',   // Emerald 500 (Available)
          red: '#EF4444',     // Red 500 (Busy)
          gray: '#94A3B8',    // Slate 400 (Offline)
          orange: '#F59E0B',  // Amber 500 (Maintenance)
          blue: '#3B82F6'     // Blue 500 (Emergency)
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'dash': 'dash 20s linear infinite',
      },
      keyframes: {
        dash: {
          to: {
            'stroke-dashoffset': '-40px',
          },
        },
      },
    },
  },
  plugins: [],
}
