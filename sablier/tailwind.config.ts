import type { Config } from 'tailwindcss';

const config: Config = {
	content: ['./src/pages/**/*.{js,ts,jsx,tsx,mdx}', './src/components/**/*.{js,ts,jsx,tsx,mdx}', './src/app/**/*.{js,ts,jsx,tsx,mdx}'],
	theme: {
		extend: {
			colors: {
				'sablier-black': '#1a1d28',
				'sablier-gray': '#2a2e41',
				'sablier-gray-text': '#909bb2',
				'sablier-shadow': '#1b1d29',
				'sablier-orange': '#f77725',
				'sablier-dark-orange': '#f7802b',
			},
		},
	},
};
export default config;
