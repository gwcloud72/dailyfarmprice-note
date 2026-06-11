/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('../../design-system/tailwind.preset.cjs')],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
};
