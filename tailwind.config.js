/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts}',
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Fira Code', 'monospace'],
        body: ['Fira Sans', 'sans-serif'],
      },
      colors: {
        primary: '#475569',
        cta: '#2563EB',
        'cta-hover': '#1D4ED8',
        background: '#F8FAFC',
        text: '#1E293B',
        muted: '#64748B',
        border: '#E2E8F0',
      },
    },
  },
  plugins: [],
}
