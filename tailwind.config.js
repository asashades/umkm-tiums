/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2F3185',
          hover: '#25276B',
        },
        canvas: '#FFFFFF',
        ink: '#0F1923',
        body: '#334155',
        muted: '#8896A7',
        hairline: '#E2E8F0',
        'neutral-1': '#F1F5F9',
        'neutral-2': '#CBD5E1',
        'badge-gold': '#FFB800',
        'border-teal': '#1CBDB3',
        'accent-dark': '#1E293B',
        'danger-subtle': '#FEF2F2',
        'danger-text': '#991B1B',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        full: '9999px',
      },
      boxShadow: {
        sm: 'rgba(0, 0, 0, 0.08) 0px 4px 12px 0px, rgba(0, 0, 0, 0.04) 0px 2px 4px 0px',
        micro: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
        nav: 'rgba(0, 0, 0, 0.07) 0px 1px 3px 0px, rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
      },
    },
  },
  plugins: [],
};
