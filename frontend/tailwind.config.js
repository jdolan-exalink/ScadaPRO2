/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        scada: {
          900: '#0f172a', // Main bg
          850: '#151e31', // Slightly lighter for gradients
          800: '#1e293b', // Card bg
          700: '#334155', // Border
          600: '#475569', // Light border
          500: '#3b82f6', // Primary
          accent: '#10b981', // Success
          warn: '#f59e0b', // Warning
          danger: '#ef4444', // Error
        }
      }
    },
  },
  plugins: [],
}
