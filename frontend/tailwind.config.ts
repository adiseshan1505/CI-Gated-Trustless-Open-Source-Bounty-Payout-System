import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        raised: "rgb(var(--surface-raised) / <alpha-value>)",
        sunken: "rgb(var(--surface-sunken) / <alpha-value>)",
        hairline: "rgb(var(--border-hairline) / <alpha-value>)",
        content: "rgb(var(--text-primary) / <alpha-value>)",
        muted: "rgb(var(--text-secondary) / <alpha-value>)",
        faint: "rgb(var(--text-muted) / <alpha-value>)",
        verify: "rgb(var(--accent-verify) / <alpha-value>)",
        action: "rgb(var(--accent-action) / <alpha-value>)",
        escrow: "rgb(var(--accent-escrow) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
      },
      borderRadius: {
        neu: "1rem",
        "neu-sm": "0.75rem",
        "neu-lg": "1.5rem",
      },
      boxShadow: {
        raised:
          "var(--shadow-offset) var(--shadow-offset) var(--shadow-blur) rgb(var(--shadow-dark) / var(--shadow-dark-a)), calc(var(--shadow-offset) * -1) calc(var(--shadow-offset) * -1) var(--shadow-blur) rgb(var(--shadow-light) / var(--shadow-light-a))",
        "raised-sm":
          "calc(var(--shadow-offset) * 0.5) calc(var(--shadow-offset) * 0.5) calc(var(--shadow-blur) * 0.5) rgb(var(--shadow-dark) / var(--shadow-dark-a)), calc(var(--shadow-offset) * -0.5) calc(var(--shadow-offset) * -0.5) calc(var(--shadow-blur) * 0.5) rgb(var(--shadow-light) / var(--shadow-light-a))",
        "raised-lg":
          "calc(var(--shadow-offset) * 1.6) calc(var(--shadow-offset) * 1.6) calc(var(--shadow-blur) * 1.5) rgb(var(--shadow-dark) / var(--shadow-dark-a)), calc(var(--shadow-offset) * -1.6) calc(var(--shadow-offset) * -1.6) calc(var(--shadow-blur) * 1.5) rgb(var(--shadow-light) / var(--shadow-light-a))",
        sunken:
          "inset var(--shadow-offset) var(--shadow-offset) var(--shadow-blur) rgb(var(--shadow-dark) / var(--shadow-dark-a)), inset calc(var(--shadow-offset) * -1) calc(var(--shadow-offset) * -1) var(--shadow-blur) rgb(var(--shadow-light) / var(--shadow-light-a))",
        "sunken-sm":
          "inset calc(var(--shadow-offset) * 0.5) calc(var(--shadow-offset) * 0.5) calc(var(--shadow-blur) * 0.6) rgb(var(--shadow-dark) / var(--shadow-dark-a)), inset calc(var(--shadow-offset) * -0.5) calc(var(--shadow-offset) * -0.5) calc(var(--shadow-blur) * 0.6) rgb(var(--shadow-light) / var(--shadow-light-a))",
        "accent-glow":
          "0 0 0 1px rgb(var(--accent-action) / 0.5), 0 0 24px -4px rgb(var(--accent-action) / 0.55)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "pulse-soft": "pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fade-in 0.4s ease-out both",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
