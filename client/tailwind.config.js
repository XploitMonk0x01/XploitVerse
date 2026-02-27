/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // TryHackMe-inspired palette
        green: {
          400: "#88cc14",
          500: "#6ABF15",
          600: "#549a10",
        },
        gray: {
          300: "#d0d4db",
          400: "#9ea4b0",
          500: "#6c7280",
          600: "#3d4555",
          700: "#2a3244",
          800: "#1f2839",
          900: "#151c2b",
          950: "#101624",
        },
        primary: {
          400: "#88cc14",
          500: "#6ABF15",
          600: "#549a10",
        },
        cyber: {
          dark: "#151c2b",
          darker: "#101624",
          accent: "#88cc14",
          red: "#C11111",
          orange: "#EF8D4C",
          blue: "#2f80ed",
        },
      },
      fontFamily: {
        sans: ["Ubuntu", "Source Sans Pro", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        display: ["Bungee", "Ubuntu", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
