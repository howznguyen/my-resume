module.exports = {
  mode: 'jit',
  content: [
    './**/*.html',
    './src/**/*.{js,jsx,ts,tsx,vue}',
  ],
  content: ["./**/*.{html,js}"],
  theme: {
    extend: {
      screens: {
        'print': {'raw': 'print'},
        // => @media print { ... }
      }
    },
  },
  plugins: [],
}
