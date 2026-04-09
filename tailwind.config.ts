import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f6fb',
          100: '#e1edf7',
          200: '#c3dbef',
          300: '#a5c9e7',
          400: '#87b7df',
          500: '#378ADD',
          600: '#2b6ab6',
          700: '#1f4a8f',
          800: '#152a68',
          900: '#0b0a41',
        },
        navy: {
          50: '#f6f7f9',
          100: '#eef0f3',
          200: '#dde1e7',
          300: '#ccd2db',
          400: '#bbc3cf',
          500: '#1a1f35',
          600: '#151a2d',
          700: '#101525',
          800: '#0b101d',
          900: '#060b15',
        },
        charcoal: {
          50: '#f9f9f9',
          100: '#f3f3f3',
          200: '#e7e7e7',
          300: '#dbdbdb',
          400: '#cfcfcf',
          500: '#404040',
          600: '#333333',
          700: '#262626',
          800: '#191919',
          900: '#0d0d0d',
        },
      },
      backgroundColor: {
        'mortgage': '#378ADD',
        'broki': '#534AB7',
        'personal': '#888780',
        'content': '#3B6D11',
        'ops': '#BA7517',
        'referrals': '#A32D2D',
      },
      textColor: {
        'mortgage': '#378ADD',
        'broki': '#534AB7',
        'personal': '#888780',
        'content': '#3B6D11',
        'ops': '#BA7517',
        'referrals': '#A32D2D',
      },
      borderColor: {
        'mortgage': '#378ADD',
        'broki': '#534AB7',
        'personal': '#888780',
        'content': '#3B6D11',
        'ops': '#BA7517',
        'referrals': '#A32D2D',
      },
    },
  },
  plugins: [],
}
export default config
