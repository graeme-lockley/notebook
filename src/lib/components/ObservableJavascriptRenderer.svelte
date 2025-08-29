<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { Inspector } from '@observablehq/inspector';
	import type { ReactiveCell } from '$lib/model/cell';
	import type { ObservableValue } from '../../runtime';

	let { cell } = $props<{
		cell: ReactiveCell;
	}>();

	let observerID: number | undefined = $state(undefined);
	let container: HTMLElement;
	let inspector: Inspector | undefined = $state(undefined);

	// Helper function to unwrap Svelte proxies
	function unwrapSvelteProxy(value: ObservableValue): ObservableValue {
		// If it's a proxy, try to get the underlying value
		if (value && typeof value === 'object' && 'target' in value) {
			// Check if it's a Svelte proxy by looking for the target property
			const proxyValue = value as { target?: unknown };
			if (proxyValue.target) {
				// Recursively unwrap nested proxies
				return unwrapSvelteProxy(proxyValue.target);
			}
		}

		// If it's an array, unwrap each element
		if (Array.isArray(value)) {
			return value.map(unwrapSvelteProxy);
		}

		// If it's an object, unwrap each property
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			const unwrapped: Record<string, unknown> = {};
			for (const [key, val] of Object.entries(value)) {
				unwrapped[key] = unwrapSvelteProxy(val);
			}
			return unwrapped;
		}

		// Return primitive values as-is
		return value;
	}

	onMount(() => {
		if (container) {
			inspector = new Inspector(container);

			observerID = cell.observers.addObserver({
				fulfilled(value: ObservableValue): void {
					if (inspector) {
						inspector.fulfilled(unwrapSvelteProxy(value));
					}
				},
				pending(): void {
					if (inspector) {
						inspector.pending();
					}
				},
				rejected(value?: ObservableValue): void {
					if (inspector) {
						inspector.rejected(value === null ? null : unwrapSvelteProxy(value));
					}
				}
			});
		}
	});

	onDestroy(() => {
		if (observerID !== undefined) {
			cell.observers.removeObserver(observerID);
		}
	});
</script>

<div bind:this={container}>
	<!-- Observable Inspector will manage content here -->
</div>
