import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        slatepanel: "#111827",
        market: {
          bg: "#06111f",
          panel: "#0d1b2f",
          line: "#1d314c",
          muted: "#8ea3c1",
          up: "#dc2626",
          down: "#16a34a",
          accent: "#38bdf8",
          soft: "#dbeafe",
        },
      },
      boxShadow: {
        soft: "0 20px 50px rgba(15, 23, 42, 0.10)",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        sans: ["'Noto Sans TC'", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
