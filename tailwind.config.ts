import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        newsprint: "var(--newsprint)",
        accent: "var(--accent)",
        "mid-gray": "var(--mid-gray)",
        "light-gray": "var(--light-gray)",
        "alert-red": "var(--alert-red)",
        "confirm-green": "var(--confirm-green)",
      },
      fontFamily: {
        display: ["var(--font-display)", "monospace"],
        mono: ["var(--font-mono)", "monospace"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
      spacing: {
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "6": "24px",
        "8": "32px",
        "12": "48px",
        "20": "80px",
      },
    },
  },
  plugins: [],
};

export default config;
