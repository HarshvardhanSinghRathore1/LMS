import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        onyx: '#0b090a',
        'carbon-black': '#161a1d',
        'dark-garnet': '#660708',
        'mahogany-red': '#a4161a',
        'mahogany-red-2': '#ba181b',
        'strawberry-red': '#e5383b',
        silver: '#b1a7a6',
        'dust-grey': '#d3d3d3',
        'white-smoke': '#f5f3f4',
        white: '#ffffff',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
