/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        pomodoro: {
          light: '#e06060',
          DEFAULT: '#ba4949',
          dark: '#a43d3d',
          bg: '#c15c5c',
        },
        shortBreak: {
          light: '#4d9c9e',
          DEFAULT: '#38858a',
          dark: '#2e6f73',
          bg: '#4c9196',
        },
        longBreak: {
          light: '#4e85ad',
          DEFAULT: '#397097',
          dark: '#2e5d7d',
          bg: '#4d7fa2',
        },
      },
      fontFamily: {
        sans: [
          'Varela Round',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      keyframes: {
        popIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        floatUp: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-60px) scale(1.4)', opacity: '0' },
        },
      },
      animation: {
        popIn: 'popIn 0.2s ease-out forwards',
        floatUp: 'floatUp 1.2s ease-out forwards',
      },
    },
  },
  plugins: [],
}
