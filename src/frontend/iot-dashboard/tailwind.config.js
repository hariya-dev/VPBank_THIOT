/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        /* ── VPBank Brand Colors ── */
        vpb: {
          green: {
            50:  '#E6F7EE',
            100: '#B3E8CF',
            200: '#80D9B0',
            300: '#4DCA91',
            400: '#26BE7A',
            500: '#00A651',  /* Primary brand green */
            600: '#008E45',
            700: '#007639',
            800: '#005E2D',
            900: '#004521',
            950: '#00331A',
          },
          dark: {
            50:  '#E8ECF1',
            100: '#C2CBD6',
            200: '#9CAABB',
            300: '#7689A0',
            400: '#5A718D',
            500: '#3E597A',
            600: '#2D4462',
            700: '#1E3350',  /* Dark navy for text/headers */
            800: '#0F223E',
            900: '#05132C',
          },
          grey: {
            50:  '#FAFBFC',
            100: '#F5F7FA',  /* Background sections */
            200: '#EDF0F4',
            300: '#DDE2E9',
            400: '#C4CCD6',
            500: '#A0ABB8',
            600: '#7C8A9A',
            700: '#5E6D7F',
            800: '#445163',
            900: '#2D3847',
          },
          accent: '#E31B23',  /* Red for alerts/critical */
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.25s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: { '0%': { opacity: 0, transform: 'translateY(12px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        slideInLeft: { '0%': { opacity: 0, transform: 'translateX(-100%)' }, '100%': { opacity: 1, transform: 'translateX(0)' } },
        slideInRight: { '0%': { opacity: 0, transform: 'translateX(12px)' }, '100%': { opacity: 1, transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
};
