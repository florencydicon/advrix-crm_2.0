import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Advrix brand green — anchored at #85DE85
        brand: {
          50: "#f0faf1",
          100: "#dcf4de",
          200: "#b9ebbd",
          300: "#85DE85",
          400: "#5ecf68",
          500: "#3fb84e",
          600: "#2f9c3f",
          700: "#287e36",
          800: "#23642d",
          900: "#1e5326",
          950: "#0d2e13",
          DEFAULT: "#85DE85",
        },
        // Advrix deep dark neutrals — anchored at #1D2A32
        night: {
          950: "#0d151b",
          900: "#121d25",
          850: "#17232c",
          800: "#1D2A32",
          700: "#243440",
          600: "#2c3f4c",
          500: "#38505f",
          400: "#4a6478",
        },
        ink: "#0d151b",
        paper: "#1D2A32",
        surface: "#17232c",
        accent: "#85DE85",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        brand: ["var(--font-brand)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
