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
                    950: "#2d0a0a", // Deep Maroon Background
                    900: "#450a0a", // Dark Maroon
                    800: "#800000", // PUP Maroon
                    700: "#991b1b",
                    600: "#dc2626",
                    500: "#eab308", // PUP Gold (Primary Action)
                    400: "#facc15",
                    300: "#fde047",
                    200: "#fef08a",
                    100: "#fef9c3",
                    50: "#fefce8",
                },
                maroon: {
                    950: "#1A120B", // Deepest Coffee
                    900: "#2D2424", // Dark Roast
                    800: "#3C2A21", // Heritage Coffee (Primary)
                    700: "#4B3621",
                    600: "#5D4037",
                    500: "#8B4513", // Saddle Brown
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
