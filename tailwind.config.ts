import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--c-bg)",
        surface: "var(--c-surface)",
        surface2: "var(--c-surface-2)",
        ink: "var(--c-text)",
        sub: "var(--c-text-sub)",
        faint: "var(--c-text-faint)",
        mint: "var(--c-mint)",
        teal: "var(--c-teal)",
        tealdeep: "var(--c-teal-deep)",
        peach: "var(--c-peach)",
        orange: "var(--c-orange)",
        amber: "var(--c-amber)",
        danger: "var(--c-danger)",
        line: "var(--c-border)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        neu: "20px",
        neuLg: "26px",
        neuXl: "32px",
      },
      boxShadow: {
        neu: "var(--shadow-raised)",
        neuSm: "var(--shadow-raised-sm)",
        neuIn: "var(--shadow-inset)",
        neuInSm: "var(--shadow-inset-sm)",
        neuPop: "var(--shadow-pop)",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
      },
      animation: {
        fadeUp: "fadeUp .45s ease both",
        pulseDot: "pulseDot 2.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
