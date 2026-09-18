/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.html",
    "./public/js/**/*.js"
  ],
  darkMode: 'class',
  theme: {
      extend: {
          colors: {
              "rankly-bg": "#F5F5F0",
              "rankly-sidebar": "#F8F8F5",
              "rankly-border": "#E5E5DF",
              "rankly-dot": "#D95D39",
              "rankly-btn": "#243E36"
          },
          fontFamily: {
              "sans": ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
              "mono": ["JetBrains Mono", "monospace"]
          }
      }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ],
}
