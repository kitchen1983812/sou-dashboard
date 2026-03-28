import type { Config } from "tailwindcss";

const config: Config = {
	content: [
		"./src/**/*.{js,ts,jsx,tsx,mdx}",
		"./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
	],
	// Safelist: dynamic class names that Tailwind's scanner may miss
	safelist: [
		// ScoreCard variant — VARIANT_BORDER map (ScoreCard.tsx)
		"border-t-gray-700",
		"border-t-brand-500",
		"border-t-green-600",
		"border-t-red-500",
		"border-t-amber-400",
	],
	theme: {
		extend: {
			colors: {
				brand: {
					50: "#e6f4fb",
					100: "#b3dff3",
					200: "#80caeb",
					300: "#4db5e3",
					400: "#1aa0db",
					500: "#008cc9",
					600: "#0078ab",
					700: "#005f8a",
					800: "#004768",
					900: "#002f47",
				},
				danger: "#DC2626",
				// Semantic color aliases (reference CSS vars from globals.css)
				"text-primary": "var(--text-primary)",
				"text-secondary": "var(--text-secondary)",
				"text-disabled": "var(--text-disabled)",
				surface: "var(--bg-surface)",
				"surface-subtle": "var(--bg-surface-subtle)",
			},
			boxShadow: {
				"elevation-1": "var(--elevation-1)",
				"elevation-2": "var(--elevation-2)",
				"elevation-3": "var(--elevation-3)",
			},
		},
	},
	plugins: [],
};

export default config;
