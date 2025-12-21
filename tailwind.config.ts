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
        'bg-blue-500/20', 'bg-blue-500/30', 'border-blue-500', 'text-blue-100', 'bg-blue-500', 'hover:bg-blue-500/30',
        // Event theme colors - red (personal)
        'bg-red-500/20', 'bg-red-500/30', 'border-red-500', 'text-red-100', 'bg-red-500', 'hover:bg-red-500/30',
        // Event theme colors - orange (meetings)
        'bg-orange-500/20', 'bg-orange-500/30', 'border-orange-500', 'text-orange-100', 'bg-orange-500', 'hover:bg-orange-500/30',
        // Event theme colors - green (holiday)
        'bg-green-500/20', 'bg-green-500/30', 'border-green-500', 'text-green-100', 'bg-green-500', 'hover:bg-green-500/30',
    ],
    theme: {
        extend: {
            colors: {
                primary: "#34d399", // Emerald-400
                secondary: "#3b82f6", // Blue-500
                "background-dark": "#09090b", // Zinc-950
                "surface-dark": "#18181b", // Zinc-900
                "surface-hover": "#27272a", // Zinc-800
                "border-dark": "#27272a", // Zinc-800
                "grid-line": "#27272a",
            },
            fontFamily: {
                sans: ["Inter", "sans-serif"],
            },
        },
    },
    plugins: [],
};

export default config;
