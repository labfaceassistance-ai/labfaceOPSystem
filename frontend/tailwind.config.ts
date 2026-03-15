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
                background: "var(--background)",
                foreground: "var(--foreground)",
                brand: {
                    950: "#020617",
                    900: "#0f172a",
                    800: "#1e293b",
                    700: "#334155",
                    600: "#475569",
                    500: "#3b82f6",
                    400: "#60a5fa",
                    300: "#93c5fd",
                    200: "#bfdbfe",
                    100: "#dbeafe",
                    50: "#eff6ff",
                },
                maroon: {
                    900: "#4a0404",
                    800: "#7f1d1d",
                    700: "#991b1b",
                    600: "#b91c1c",
                    500: "#dc2626",
                },
                gold: {
                    500: "#eab308",
                    400: "#facc15",
                    300: "#fde047",
                }
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.5s ease-out',
                'pulse-slow': 'pulse 3s infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
            },
        },
    },
    plugins: [],
};
export default config;
