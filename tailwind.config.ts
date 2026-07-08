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
				// スクルドブルー基調 (デザインガイド Ver.1.0)
				// 500=ライトブルー #2E7CC2 / 700=スクルドブルー #1B5C8A
				brand: {
					50: "#eef5fb",
					100: "#d9e8f5",
					200: "#c7def2",
					300: "#a9cbe8",
					400: "#6ba3d6",
					500: "#2e7cc2",
					600: "#24699f",
					700: "#1b5c8a",
					800: "#164a6f",
					900: "#103850",
				},
				// アクセント (「ここぞ」の一点用・多色使いは避ける)
				coral: { 50: "#fcede6", 500: "#e8825a", 600: "#d26a43" },
				sunny: { 50: "#fdf3da", 500: "#f2c14e", 600: "#c99a2e" },
				sky: { 50: "#e4f1f6", 500: "#4fa9c9", 600: "#3d8fac" },
				paper: "#fbfaf6",
				ink: "#22302e",
				danger: "#DC2626",
				// Semantic color aliases (reference CSS vars from globals.css)
				"text-primary": "var(--text-primary)",
				"text-secondary": "var(--text-secondary)",
				"text-disabled": "var(--text-disabled)",
				surface: "var(--bg-surface)",
				"surface-subtle": "var(--bg-surface-subtle)",
			},
			fontFamily: {
				display: ["var(--font-display)", "var(--font-body)", "sans-serif"],
				body: ["var(--font-body)", "sans-serif"],
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
