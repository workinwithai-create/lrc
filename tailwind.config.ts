import type { Config } from 'tailwindcss';

const config: Config = {
  // Brand preset adds walnut/copper/cream palette + label/body font stacks.
  // LRC's own extend below still wins on display/serif/mono — no visual change
  // to existing screens.
  presets: [require('./brand/tailwind.preset.js')],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './brand/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0f0e0c',
        paper: '#f4f1ea',
        blood: '#d63f1e',
        gold: '#e8b923',
        mute: '#6b665e',
      },
      fontFamily: {
        display: ['Anton', 'sans-serif'],
        serif: ['Instrument Serif', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
