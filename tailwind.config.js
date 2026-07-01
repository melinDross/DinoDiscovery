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
        // Pink/magenta palette lifted by eye from the "Dino Discovery"
        // logo (public/dino-discovery-logo.png) — used for buttons
        // project-wide (see the logo-matching brand refresh), kept
        // separate from `accent` (lime) since the card/rarity system's
        // green identity wasn't part of that request and stays untouched.
        brand: {
          DEFAULT: '#ec1a8f',
          light: '#ff7fd5',
          dark: '#7a0d4a',
        },
      },
      fontFamily: {
        display: ['Bangers', 'cursive'],
        // Rounded "bubble" display font matching the logo's lettering —
        // used for buttons project-wide alongside the `brand` palette
        // above. Kept separate from `display` (Bangers), which the card
        // and other non-button UI still use.
        display2: ['Fredoka', 'sans-serif'],
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
      keyframes: {
        'egg-breathe': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.03)' },
        },
        'egg-wobble': {
          '0%, 100%': { transform: 'rotate(-6deg)' },
          '50%': { transform: 'rotate(6deg)' },
        },
        'egg-glow': {
          '0%, 100%': { filter: 'brightness(1)' },
          '50%': { filter: 'brightness(1.4)' },
        },
        'egg-jitter': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-3px)' },
          '75%': { transform: 'translateX(3px)' },
        },
        'egg-tug': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'egg-burst': {
          '0%': { transform: 'scale(0.7)', opacity: '0' },
          '40%': { transform: 'scale(1.3)', opacity: '1' },
          '100%': { transform: 'scale(1.1)', opacity: '1' },
        },
      },
      animation: {
        'egg-breathe': 'egg-breathe 2.4s ease-in-out infinite',
        'egg-wobble': 'egg-wobble 1.2s ease-in-out infinite',
        'egg-glow': 'egg-glow 1.4s ease-in-out infinite',
        'egg-jitter': 'egg-jitter 0.5s ease-in-out infinite',
        'egg-tug': 'egg-tug 1s ease-in-out infinite',
        'egg-burst': 'egg-burst 0.6s ease-out forwards',
      },
    },
  },
  plugins: [],
};
