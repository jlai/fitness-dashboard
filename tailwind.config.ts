import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      keyframes: {
        "wobble-z": {
          "0%": { rotate: "z 0deg" },
          "25%": { rotate: "z -6deg" },
          "50%": { rotate: "z -0deg" },
          "75%": { rotate: "z 6deg" },
          "100%": { rotate: "z 0deg" },
        },
      },
      animation: {
        "wobble-z": "wobble-z 1.5s linear infinite",
      },
    },
  },
  plugins: [],
  variants: {
    extend: {
      animation: ["hover", "motion-safe"],
    },
  },
};
export default config;
