import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate"; // 🚀 FIX: require() ni jagya e import lagavyu

const config = {
  darkMode: "class",
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        sidebar: {
          bg: "#111424", 
          hover: "#1E2235",
          active: "#1E3A8A",
          text: "#9CA3AF",
          textActive: "#FFFFFF",
        },
        app: {
          bg: "#F4F5F8", 
          card: "#FFFFFF",
          border: "#E5E7EB",
        },
        primary: {
          DEFAULT: "#4F46E5",
          hover: "#4338CA",
          foreground: "#FFFFFF",
        },
        success: {
          DEFAULT: "#10B981",
          bg: "#D1FAE5",
          text: "#065F46",
        },
        warning: {
          DEFAULT: "#F59E0B",
          bg: "#FEF3C7",
          text: "#92400E",
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  // 🚀 FIX: Plugin ne sidhu call karyu
  plugins: [tailwindcssAnimate],
} satisfies Config;

export default config;