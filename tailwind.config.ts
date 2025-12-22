import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class", "class"],
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
    			primary: {
    				DEFAULT: 'hsl(var(--primary))',
    				foreground: 'hsl(var(--primary-foreground))'
    			},
    			secondary: {
    				DEFAULT: 'hsl(var(--secondary))',
    				foreground: 'hsl(var(--secondary-foreground))'
    			},
    			'background-dark': '#09090b',
    			'surface-dark': '#18181b',
    			'surface-hover': '#27272a',
    			'border-dark': '#27272a',
    			'grid-line': '#27272a',
    			background: 'hsl(var(--background))',
    			foreground: 'hsl(var(--foreground))',
    			card: {
    				DEFAULT: 'hsl(var(--card))',
    				foreground: 'hsl(var(--card-foreground))'
    			},
    			popover: {
    				DEFAULT: 'hsl(var(--popover))',
    				foreground: 'hsl(var(--popover-foreground))'
    			},
    			muted: {
    				DEFAULT: 'hsl(var(--muted))',
    				foreground: 'hsl(var(--muted-foreground))'
    			},
    			accent: {
    				DEFAULT: 'hsl(var(--accent))',
    				foreground: 'hsl(var(--accent-foreground))'
    			},
    			destructive: {
    				DEFAULT: 'hsl(var(--destructive))',
    				foreground: 'hsl(var(--destructive-foreground))'
    			},
    			border: 'hsl(var(--border))',
    			input: 'hsl(var(--input))',
    			ring: 'hsl(var(--ring))',
    			chart: {
    				'1': 'hsl(var(--chart-1))',
    				'2': 'hsl(var(--chart-2))',
    				'3': 'hsl(var(--chart-3))',
    				'4': 'hsl(var(--chart-4))',
    				'5': 'hsl(var(--chart-5))'
    			}
    		},
    		fontFamily: {
    			sans: [
    				'Inter',
    				'sans-serif'
    			]
    		},
    		borderRadius: {
    			lg: 'var(--radius)',
    			md: 'calc(var(--radius) - 2px)',
    			sm: 'calc(var(--radius) - 4px)'
    		}
    	}
    },
    plugins: [require("tailwindcss-animate")],
};

export default config;
