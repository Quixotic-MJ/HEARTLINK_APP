/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
          foreground: "rgb(var(--color-primary-foreground) / <alpha-value>)",
        },
        background: "rgb(var(--color-background) / <alpha-value>)",
        foreground: "rgb(var(--color-foreground) / <alpha-value>)",
        card: {
          DEFAULT: "rgb(var(--color-card) / <alpha-value>)",
          foreground: "rgb(var(--color-card-foreground) / <alpha-value>)",
        },
        border: "rgb(var(--color-border) / <alpha-value>)",
        muted: {
          DEFAULT: "rgb(var(--color-muted) / <alpha-value>)",
          foreground: "rgb(var(--color-muted-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "rgb(var(--color-destructive) / <alpha-value>)",
          foreground: "rgb(var(--color-destructive-foreground) / <alpha-value>)",
        },
        success: {
          DEFAULT: "rgb(var(--color-success) / <alpha-value>)",
          foreground: "rgb(var(--color-success-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--color-accent) / <alpha-value>)",
          foreground: "rgb(var(--color-accent-foreground) / <alpha-value>)",
        },
        health: {
          stable: "rgb(var(--color-health-stable) / <alpha-value>)",
          "stable-track": "rgb(var(--color-health-stable-track) / <alpha-value>)",
          caution: "rgb(var(--color-health-caution) / <alpha-value>)",
          "caution-track": "rgb(var(--color-health-caution-track) / <alpha-value>)",
          warning: "rgb(var(--color-health-warning) / <alpha-value>)",
          "warning-track": "rgb(var(--color-health-warning-track) / <alpha-value>)",
          risk: "rgb(var(--color-health-risk) / <alpha-value>)",
          "risk-track": "rgb(var(--color-health-risk-track) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
};