import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        canvas: "#f6f7f9",
        line: "#dbe1ea",
        muted: "#697586",
        brand: {
          50: "#eef7ff",
          100: "#d9edff",
          200: "#b9dcff",
          500: "#2276d2",
          600: "#175fb2",
          700: "#154f91"
        },
        mint: {
          50: "#eafaf3",
          600: "#0f8b63"
        },
        amberline: {
          50: "#fff6dc",
          600: "#b77905"
        }
      },
      boxShadow: {
        panel: "0 1px 2px rgba(17, 24, 39, 0.05), 0 18px 48px rgba(17, 24, 39, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
