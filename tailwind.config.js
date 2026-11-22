/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          400: "#d4af37",
          500: "#c79d2b",
          600: "#a7801f",
        },
        sand: {
          300: "#e4d6c1",
          400: "#cdb593",
          500: "#b39b78",
        },
        ink: {
          950: "#0b0b0c",
          900: "#131315",
          800: "#1b1b1e",
        },
        charcoal: {
          950: "#0a0a0a",
          900: "#111111",
          850: "#151515",
          800: "#1a1a1a",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "Times New Roman", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
