import type { Config } from "tailwindcss";

const config: Config = {
	content: [
		"./src/**/*.{js,ts,jsx,tsx,mdx}",
		"./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
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
			},
		},
	},
	plugins: [],
};

export default config;
