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
          bg: '#f8fafc',      // Slate 50
          card: '#ffffff',    // Pure White
          border: '#e2e8f0',  // Slate 200
          hover: '#f1f5f9'    // Slate 100
        },
        brand: {
          green: '#16a34a',   // Emerald 600
          red: '#dc2626',     // Red 600
          gray: '#64748b',    // Slate 500
          orange: '#d97706',  // Amber 600
          blue: '#2563eb'     // Blue 600
        },
        slate: {
          50: '#0f172a',
          100: '#1e293b',
          200: '#334155',
          300: '#475569',
          400: '#64748b',
          500: '#94a3b8',
          600: '#cbd5e1',
          700: '#cbd5e1',
          800: '#e2e8f0',
          900: '#f1f5f9',
          950: '#f8fafc'
        },
        red: {
          400: '#dc2626',
          500: '#dc2626'
        },
        amber: {
          400: '#d97706',
          500: '#d97706'
        },
        yellow: {
          400: '#ca8a04',
          500: '#ca8a04'
        },
        emerald: {
          400: '#16a34a',
          500: '#16a34a'
        },
        purple: {
          400: '#7c3aed',
          500: '#7c3aed'
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
