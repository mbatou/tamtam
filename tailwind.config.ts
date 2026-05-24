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
        tt: {
          orange: "#D35400",
          "orange-light": "#FEF0E7",
          "orange-mid": "#F0997B",
          "orange-dark": "#9A3D08",
          night: "#0A0A1A",
          "night-2": "#111128",
          teal: "#1D9E75",
          "teal-mid": "#5DCAA5",
          "teal-light": "#E1F5EE",
          ivory: "#F5F3EE",
        },
        tamtam: {
          orange: "#D35400",
          gold: "#F39C12",
          purple: "#6C3483",
          teal: "#1ABC9C",
          dark: "#0F0F1F",
          darker: "#0A0A18",
          surface: "#1A1A2E",
        },
      },
      fontFamily: {
        outfit: ["Outfit", "sans-serif"],
        syne: ["Syne", "sans-serif"],
        dm: ["DM Sans", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        btn: "26px",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #D35400, #F39C12)",
        "gradient-secondary": "linear-gradient(135deg, #6C3483, #8E44AD)",
        "gradient-teal": "linear-gradient(135deg, #1ABC9C, #16A085)",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(211, 84, 0, 0.4)" },
          "50%": { boxShadow: "0 0 20px 4px rgba(211, 84, 0, 0.15)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "wave-bar": {
          "0%, 100%": { transform: "scaleY(1)" },
          "50%": { transform: "scaleY(1.8)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        ripple: {
          "0%": { transform: "scale(1)", opacity: "0.4" },
          "100%": { transform: "scale(4)", opacity: "0" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "slide-up": "slide-up 0.5s ease-out forwards",
        float: "float 3s ease-in-out infinite",
        "float-slow": "float-slow 4s ease-in-out infinite",
        marquee: "marquee 25s linear infinite",
        "wave-bar": "wave-bar 1.2s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        ripple: "ripple 0.6s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
