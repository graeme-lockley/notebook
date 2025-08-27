<script lang="ts">
	import { onDestroy } from 'svelte';
	import { plot } from '@observablehq/plot';
	import katex from '@observablehq/katex';
	import { marked } from 'marked';
	import type { CellKind } from '$lib/types/cell';

	let {
		value,
		kind,
		className = ''
	} = $props<{
		value: unknown;
		kind: CellKind;
		className?: string;
	}>();
	let container: HTMLElement;
	let renderedElement: HTMLElement | null = null;

	// Type guards for different value types
	function isPlot(value: unknown): value is Record<string, unknown> {
		return Boolean(value && typeof value === 'object' && 'plot' in value);
	}

	function isHTMLElement(value: unknown): value is HTMLElement {
		return value instanceof HTMLElement;
	}

	function isString(value: unknown): value is string {
		return typeof value === 'string';
	}

	function isNumber(value: unknown): value is number {
		return typeof value === 'number';
	}

	function isArray(value: unknown): value is unknown[] {
		return Array.isArray(value);
	}

	function isObject(value: unknown): value is Record<string, unknown> {
		return value !== null && typeof value === 'object' && !Array.isArray(value);
	}

	// Render different types of values
	async function renderValue() {
		if (!container) return;

		// Clear previous content
		if (renderedElement) {
			renderedElement.remove();
			renderedElement = null;
		}

		try {
			if (kind === 'html' && isString(value)) {
				renderStringHTMLElement(value);
			} else if (kind === 'md' && isString(value)) {
				await renderStringMarkdown(value);
			} else if (isPlot(value)) {
				await renderPlot(value);
			} else if (isHTMLElement(value)) {
				renderHTMLElement(value);
			} else if (isString(value)) {
				renderString(value);
			} else if (isNumber(value)) {
				renderNumber(value);
			} else if (isArray(value)) {
				renderArray(value);
			} else if (isObject(value)) {
				renderObject(value);
			} else {
				renderPrimitive(value);
			}
		} catch (error) {
			renderError(error);
		}
	}

	// Render Observable Plot
	async function renderPlot(plotValue: Record<string, unknown>) {
		try {
			const plotElement = await plot(plotValue);
			// eslint-disable-next-line svelte/no-dom-manipulating
			container.appendChild(plotElement);
			renderedElement = plotElement;
		} catch (error) {
			console.error('Error rendering plot:', error);
			renderError(error);
		}
	}

	// Render HTML Element
	function renderStringHTMLElement(element: string) {
		const div = document.createElement('div');
		div.innerHTML = element;

		// eslint-disable-next-line svelte/no-dom-manipulating
		container.appendChild(div);
		renderedElement = div;
	}

	// Render Markdown
	async function renderStringMarkdown(element: string) {
		const div = document.createElement('div');
		div.innerHTML = await marked.parse(element);
		// eslint-disable-next-line svelte/no-dom-manipulating
		container.appendChild(div);
		renderedElement = div;
	}

	// Render HTML Element
	function renderHTMLElement(element: HTMLElement) {
		const clone = element.cloneNode(true) as HTMLElement;
		// eslint-disable-next-line svelte/no-dom-manipulating
		container.appendChild(clone);
		renderedElement = clone;
	}

	// Render String (with potential LaTeX detection)
	function renderString(str: string) {
		// Check if string contains LaTeX expressions
		if (str.includes('\\') || str.includes('$')) {
			try {
				const html = katex.renderToString(str, {
					throwOnError: false,
					displayMode: true
				});
				const div = document.createElement('div');
				div.innerHTML = html;
				div.className = 'katex-display';
				// eslint-disable-next-line svelte/no-dom-manipulating
				container.appendChild(div);
				renderedElement = div;
			} catch {
				// Fallback to plain text if LaTeX rendering fails
				const div = document.createElement('div');
				div.textContent = str;
				div.className = 'string-value';
				// eslint-disable-next-line svelte/no-dom-manipulating
				container.appendChild(div);
				renderedElement = div;
			}
		} else {
			const div = document.createElement('div');
			div.textContent = str;
			div.className = 'string-value';
			// eslint-disable-next-line svelte/no-dom-manipulating
			container.appendChild(div);
			renderedElement = div;
		}
	}

	// Render Number
	function renderNumber(num: number) {
		const div = document.createElement('div');
		div.textContent = num.toString();
		div.className = 'number-value';
		// eslint-disable-next-line svelte/no-dom-manipulating
		container.appendChild(div);
		renderedElement = div;
	}

	// Render Array
	function renderArray(arr: unknown[]) {
		const div = document.createElement('div');
		div.className = 'array-value';

		if (arr.length === 0) {
			div.textContent = '[]';
		} else if (arr.length <= 10) {
			div.textContent = JSON.stringify(arr, null, 2);
		} else {
			div.textContent = `[${arr.slice(0, 10).join(', ')}... (${arr.length} items)]`;
		}

		// eslint-disable-next-line svelte/no-dom-manipulating
		container.appendChild(div);
		renderedElement = div;
	}

	// Render Object
	function renderObject(obj: Record<string, unknown>) {
		const div = document.createElement('div');
		div.className = 'object-value';

		// Fallback to JSON representation
		const keys = Object.keys(obj);
		if (keys.length === 0) {
			div.textContent = '{}';
		} else if (keys.length <= 5) {
			div.textContent = JSON.stringify(obj, null, 2);
		} else {
			div.textContent = `{${keys.slice(0, 5).join(', ')}... (${keys.length} properties)}`;
		}

		// eslint-disable-next-line svelte/no-dom-manipulating
		container.appendChild(div);
		renderedElement = div;
	}

	// Render Primitive Values
	function renderPrimitive(value: unknown) {
		const div = document.createElement('div');
		div.textContent = String(value);
		div.className = 'primitive-value';
		// eslint-disable-next-line svelte/no-dom-manipulating
		container.appendChild(div);
		renderedElement = div;
	}

	// Render Error
	function renderError(error: unknown) {
		const div = document.createElement('div');
		div.className = 'render-error';
		div.innerHTML = `
			<div class="error-icon">⚠️</div>
			<div class="error-message">
				<strong>Render Error:</strong> ${error instanceof Error ? error.message : String(error)}
			</div>
		`;
		// eslint-disable-next-line svelte/no-dom-manipulating
		container.appendChild(div);
		renderedElement = div;
	}

	// Reactive statement to re-render when value changes
	$effect(() => {
		renderValue();
	});

	onDestroy(() => {
		if (renderedElement) {
			renderedElement.remove();
		}
	});
</script>

<div bind:this={container} class="observable-value-renderer {className}">
	<!-- Content will be dynamically inserted here -->
</div>

<style>
	.observable-value-renderer {
		width: 100%;
		min-height: 1em;
	}

	.string-value {
		font-family: var(--font-mono);
		white-space: pre-wrap;
		word-break: break-word;
	}

	.number-value {
		font-family: var(--font-mono);
		font-weight: 500;
	}

	.array-value,
	.object-value {
		font-family: var(--font-mono);
		font-size: 0.9em;
		background-color: var(--color-gray-50);
		padding: 0.5rem;
		border-radius: 0.25rem;
		white-space: pre-wrap;
		overflow-x: auto;
	}

	.primitive-value {
		font-family: var(--font-mono);
		color: var(--color-gray-600);
	}

	.render-error {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.75rem;
		background-color: var(--color-red-50);
		border: 1px solid var(--color-red-200);
		border-radius: 0.375rem;
		color: var(--color-red-800);
		font-size: 0.875rem;
	}

	.error-icon {
		font-size: 1rem;
		flex-shrink: 0;
	}

	.error-message {
		flex: 1;
	}

	.katex-display {
		margin: 1rem 0;
		text-align: center;
	}

	/* Plot container styling */
	.observable-value-renderer :global(svg) {
		max-width: 100%;
		height: auto;
	}

	/* Graphviz styling */
	.observable-value-renderer :global(.graphviz) {
		text-align: center;
		margin: 1rem 0;
	}

	/* HTML and Markdown content styling */
	.observable-value-renderer :global(h1),
	.observable-value-renderer :global(h2),
	.observable-value-renderer :global(h3),
	.observable-value-renderer :global(h4),
	.observable-value-renderer :global(h5),
	.observable-value-renderer :global(h6) {
		margin: 1rem 0 0.5rem 0;
		font-weight: var(--font-weight-semibold);
		line-height: 1.25;
	}

	.observable-value-renderer :global(h1) {
		font-size: 1.5rem;
	}

	.observable-value-renderer :global(h2) {
		font-size: 1.25rem;
	}

	.observable-value-renderer :global(h3) {
		font-size: 1.125rem;
	}

	.observable-value-renderer :global(p) {
		margin: 0.5rem 0;
		line-height: 1.6;
	}

	.observable-value-renderer :global(ul),
	.observable-value-renderer :global(ol) {
		margin: 0.5rem 0;
		padding-left: 1.5rem;
	}

	.observable-value-renderer :global(li) {
		margin: 0.25rem 0;
		line-height: 1.5;
	}

	.observable-value-renderer :global(ul li) {
		list-style-type: disc;
	}

	.observable-value-renderer :global(ol li) {
		list-style-type: decimal;
	}

	.observable-value-renderer :global(blockquote) {
		margin: 0.5rem 0;
		padding-left: 1rem;
		border-left: 3px solid var(--color-gray-300);
		color: var(--color-gray-600);
	}

	.observable-value-renderer :global(code) {
		background-color: var(--color-gray-100);
		padding: 0.125rem 0.25rem;
		border-radius: 0.25rem;
		font-family: var(--font-family-mono);
		font-size: 0.875em;
	}

	.observable-value-renderer :global(pre) {
		background-color: var(--color-gray-100);
		padding: 1rem;
		border-radius: 0.375rem;
		overflow-x: auto;
		margin: 0.5rem 0;
	}

	.observable-value-renderer :global(pre code) {
		background-color: transparent;
		padding: 0;
	}

	.observable-value-renderer :global(strong) {
		font-weight: var(--font-weight-semibold);
	}

	.observable-value-renderer :global(em) {
		font-style: italic;
	}

	.observable-value-renderer :global(a) {
		color: var(--color-primary);
		text-decoration: underline;
	}

	.observable-value-renderer :global(a:hover) {
		color: var(--color-primary-hover);
	}
</style>
