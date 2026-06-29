/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0d1a0f',
        surface1: '#1a3d1a',
        surface2: '#0f2a0f',
        accent: '#b2ff00',
        cream: '#f5e6c8',
        sage: '#7a9e7a',
        moss: '#5a7a5a',
      },
      fontFamily: {
        display: ['Bangers', 'cursive'],
        body: ['"Space Grotesk"', 'sans-serif'],
      },
      borderRadius: {
        none: '0px',
        sm: '3px',
        DEFAULT: '3px',
        md: '4px',
        lg: '4px',
        xl: '4px',
        '2xl': '4px',
        '3xl': '4px',
        full: '4px',
      },
    },
  },
  plugins: [],
};
