import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	resolve: {
		alias: {
			'@': './src',
			'@lib': './src/lib',
			'@components': './src/lib/components',
			'@utils': './src/lib/utils'
		}
	},
	server: {
		port: 5173,
		host: true,
		strictPort: false,
		hmr: {
			overlay: true
		}
	},
	preview: {
		port: 4173,
		host: true,
		strictPort: false
	},
	// Add SSR-specific configuration
	ssr: {
		noExternal: ['@sveltejs/kit']
	}
});
