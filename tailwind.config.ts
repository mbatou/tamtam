import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0F0F1F",
        foreground: "#EDEDED",
        primary: {
          DEFAULT: "#D35400",
          light: "#F39C12",
        },
        secondary: "#6C3483",
        accent: "#1ABC9C",
        card: "rgba(255,255,255,0.03)",
        "card-hover": "rgba(255,255,255,0.06)",
      },
      fontFamily: {
        outfit: ["Outfit", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        btn: "26px",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #D35400, #F39C12)",
        "gradient-secondary": "linear-gradient(135deg, #6C3483, #8E44AD)",
      },
    },
  },
  plugins: [],
};
export default config;
