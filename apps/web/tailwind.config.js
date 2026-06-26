/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#bccfff",
          300: "#8eadff",
          400: "#5980ff",
          500: "#2e56ff",
          600: "#0B5FEF",
          700: "#0a4fd8",
          800: "#0e41ae",
          900: "#123a89",
        },
      },
    },
  },
  plugins: [],
};
