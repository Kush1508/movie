/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border, 240 3.7% 15.9%))",
        input: "hsl(var(--input, 240 3.7% 15.9%))",
        ring: "hsl(var(--ring, 240 4.9% 83.9%))",
        background: "hsl(var(--background, 240 10% 3.9%))",
        foreground: "hsl(var(--foreground, 0 0% 98%))",
        canvas: {
          950: '#070709',
          900: '#0c0c0f',
          850: '#121217',
          800: '#181820',
          700: '#262633',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
          glow: 'rgba(99, 102, 241, 0.4)',
        },
      },
      borderRadius: {
        lg: "var(--radius, 0.75rem)",
        md: "calc(var(--radius, 0.75rem) - 2px)",
        sm: "calc(var(--radius, 0.75rem) - 4px)",
      },
      boxShadow: {
        '21st-dock': '0 0 0 1px rgba(255, 255, 255, 0.08), 0 20px 40px -10px rgba(0, 0, 0, 0.8), 0 0 20px rgba(99, 102, 241, 0.15)',
        '21st-card': '0 0 0 1px rgba(255, 255, 255, 0.06), 0 10px 30px rgba(0, 0, 0, 0.6)',
        '21st-glow': '0 0 50px -10px rgba(99, 102, 241, 0.35)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      animation: {
        'ambient-pulse': 'ambientPulse 8s ease-in-out infinite',
      },
      keyframes: {
        ambientPulse: {
          '0%, 100%': { opacity: '0.2', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
};
