import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./types.ts",
    ],
    safelist: [
        // Event theme colors - blue (business)
        'bg-blue-600', 'border-blue-600', 'text-blue-900', 'hover:bg-blue-700',
        // Event theme colors - red (personal)
        'bg-red-600', 'border-red-600', 'text-red-900', 'hover:bg-red-700',
        // Event theme colors - orange (meetings)
        'bg-orange-600', 'border-orange-600', 'text-orange-900', 'hover:bg-orange-700',
        // Event theme colors - green (holiday)
        'bg-green-600', 'border-green-600', 'text-green-900', 'hover:bg-green-700',
    ],
    theme: {
        extend: {
            colors: {
                // Neo-brutalist Base
                background: "#f5f5f0",
                foreground: "#1a1a1a",
                surface: "#ffffff",
                accent: {
                    DEFAULT: "#2d2d2d",
                    hover: "#1a1a1a",
                },

                // Borders - Strong and visible
                border: "#1a1a1a",
                "border-strong": "#000000",

                // Typography
                "fg-muted": "#666666",
                "fg-subtle": "#999999",

                // Legacy mappings for compatibility
                canvas: "#ffffff",
                "surface-raised": "#ffffff",
                "surface-overlay": "#ffffff",
                "surface-dark": "#ffffff",
                "surface-hover": "#f0f0eb",
                "background-dark": "#f5f5f0",
                "border-dark": "#1a1a1a",
                "border-subtle": "#333333",
                "grid-line": "#d0d0cc",
                primary: "#2d2d2d",
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
            },
            boxShadow: {
                'brutal': '4px 4px 0 0 #1a1a1a',
                'brutal-sm': '2px 2px 0 0 #1a1a1a',
                'brutal-lg': '6px 6px 0 0 #1a1a1a',
            },
            animation: {
                'bounce-in': 'bounceIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                'slide-in': 'slideIn 0.15s cubic-bezier(0.4, 0, 0.2, 1) forwards',
            },
            keyframes: {
                bounceIn: {
                    '0%': { transform: 'scale(0.98)' },
                    '100%': { transform: 'scale(1)' },
                },
                slideIn: {
                    '0%': { opacity: '0', transform: 'translateY(-4px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
};

export default config;
