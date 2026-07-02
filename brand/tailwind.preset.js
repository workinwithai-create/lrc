// WorkinWithAI Tailwind preset · v1
// Usage in an app's tailwind.config: { presets: [require('./brand/tailwind.preset.js')] }
module.exports = {
  theme: { extend: {
    colors: {
      walnut: { deep: '#1A120C', DEFAULT: '#241811', raised: '#2E2016', edge: '#3D2B1D' },
      copper: { DEFAULT: '#B87333', hi: '#E8B870' },
      cream:  { DEFAULT: '#EFE3D0', dim: '#B9A88F', faint: '#7A6A55' },
      patina: '#5E8C7B',
      danger: '#C4573B',
    },
    fontFamily: {
      display: ['Bebas Neue', 'sans-serif'],
      label:   ['Oswald', 'sans-serif'],
      body:    ['Hanken Grotesk', 'sans-serif'],
      mono:    ['JetBrains Mono', 'monospace'],
    },
  }},
};
