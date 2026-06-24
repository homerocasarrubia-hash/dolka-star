import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "red-primary": "#E2393C",
        "red-logo": "#FE0000",
        cream: "#EEE7D4",
        ink: "#0B1014",
      },
      fontFamily: {
        display: ["Anton", "Oswald", "sans-serif"],
        body: ["Inter", "Work Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
