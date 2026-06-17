/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Claude AI inspired palette
        sand: {
          50: '#faf9f7',
          100: '#f5f3ef',
          200: '#ece8e1',
          300: '#ddd7cc',
          400: '#c4baa8',
          500: '#a89d8b',
          600: '#8c7f6c',
          700: '#6b6050',
          800: '#4a4238',
          900: '#2d2924',
        },
        accent: {
          DEFAULT: '#c96442',
          light: '#e07a5a',
          dark: '#a84e30',
        },
        surface: {
          primary: '#faf9f7',
          secondary: '#f5f3ef',
          tertiary: '#ece8e1',
        },
        text: {
          primary: '#2d2924',
          secondary: '#6b6050',
          tertiary: '#8c7f6c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        soft: '0 2px 8px rgba(45, 41, 36, 0.06)',
        medium: '0 4px 16px rgba(45, 41, 36, 0.08)',
        large: '0 8px 32px rgba(45, 41, 36, 0.12)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
