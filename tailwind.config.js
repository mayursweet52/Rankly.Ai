/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.{html,js}",
    "./src/**/*.{html,js,jsx,ts,tsx}",
    "./components/**/*.{html,js,jsx,ts,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#00E5FF',     // Electric Cyber Cyan
          secondary: '#3B82F6',   // Vivid Royal Blue
          accent: '#6366F1',      // Indigo Glow
          deep: '#060814'         // Deep Obsidian Navy
        }
      },
      backgroundImage: {
        'portal-gradient': 'linear-gradient(135deg, #00E5FF 0%, #3B82F6 50%, #6366F1 100%)',
        'portal-card': 'radial-gradient(circle at 50% 30%, rgba(7, 10, 19, 0.65) 0%, rgba(7, 10, 19, 0.92) 80%, #070A13 100%)'
      }
    }
  },
  plugins: []
};
