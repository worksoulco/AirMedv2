/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: '#00B2B2', // Bright teal
          light: '#40E0E0', // Light teal
          dark: '#007A7A', // Dark teal
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#004F4F', // Dark blue-green
          light: '#006666', // Medium blue-green
          dark: '#003939', // Very dark blue-green
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#00E5E5', // Bright cyan
          light: '#80F2F2', // Light cyan
          dark: '#00CCCC', // Dark cyan
          foreground: '#003939',
        },
        destructive: {
          DEFAULT: '#FF4444',
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT: '#F0F9F9',
          foreground: '#004F4F',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#004F4F',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#004F4F',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};