/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cafe: {
          bg: '#faf3e0',
          card: '#fff8f0',
          cardAlt: '#f5ece0',
          primary: '#8b5e3c',
          primaryLight: '#a67c52',
          accent: '#d4a373',
          accentLight: '#e8c99a',
          text: '#3d2b1f',
          muted: '#9d7b6a',
          border: '#e9d8c2',
          highlight: '#f59e0b',
          highlightBg: '#fef3c7',
          green: '#5a7a5a',
          greenLight: '#d4edda',
          red: '#8b3a3a',
          redLight: '#fde8e8',
        },
      },
      fontFamily: {
        sans: ['Georgia', 'serif'],
        japanese: ['Hiragino Mincho ProN', 'Yu Mincho', 'serif'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(139, 94, 60, 0.12)',
        popup: '0 8px 32px rgba(139, 94, 60, 0.25)',
      },
    },
  },
  plugins: [],
};
