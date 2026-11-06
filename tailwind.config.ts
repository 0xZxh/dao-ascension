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
        near: {
          green: "#00EC97",
          dark: "#0B0F17",
          card: "#111827",
          border: "#1F2937",
        },
      },
    },
  },
  plugins: [],
};
export default config;
