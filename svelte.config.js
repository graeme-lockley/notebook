import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	onwarn: (warning, handler) => {
		// Suppress css-unused-selector warnings - they're false positives when:
		// 1. Classes are applied to child Svelte components (static analyzer can't detect them)
		// 2. Classes are used in dynamic content via {@html}
		// 3. Classes are applied to third-party component libraries
		// These false positives create cognitive load and support a "broken windows" culture
		if (warning.code === 'css-unused-selector') {
			return; // Suppress this warning
		}
		// Handle all other warnings normally
		handler(warning);
	},

	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter()
	}
};

export default config;
