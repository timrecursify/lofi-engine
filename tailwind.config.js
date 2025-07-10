/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        // Spotify-inspired color scheme from PRD
        'bg': '#191414',
        'surface': '#282828',
        'primary': '#1DB954',
        'primary-hover': '#1ED760',
        'secondary': '#FFFFFF',
        'muted': '#B3B3B3',
        'accent': '#535353',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'md': '8px',
      },
      spacing: {
        '1': '4px',
        '5': '20px',
        '8': '32px',
      },
    },
  },
  plugins: [
    require('daisyui'),
  ],
  daisyui: {
    themes: [
      {
        lofi: {
          "primary": "#1DB954",
          "primary-focus": "#1ED760",
          "primary-content": "#000000",
          "secondary": "#FFFFFF",
          "secondary-focus": "#B3B3B3",
          "secondary-content": "#191414",
          "accent": "#535353",
          "accent-focus": "#404040",
          "accent-content": "#FFFFFF",
          "neutral": "#282828",
          "neutral-focus": "#191414",
          "neutral-content": "#FFFFFF",
          "base-100": "#191414",
          "base-200": "#282828",
          "base-300": "#404040",
          "base-content": "#FFFFFF",
          "info": "#1DB954",
          "success": "#1DB954",
          "warning": "#FFBD2E",
          "error": "#FF5F56",
        },
      },
    ],
  },
}; 