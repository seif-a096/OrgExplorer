/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        github: {
          green: '#238636',
          dark: '#0d1117',
          border: '#30363d',
          canvas: '#010409',
          muted: '#8b949e',
          text: '#c9d1d9'
        }
      }
    },
  },
  plugins: [],
}
