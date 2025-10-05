<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { Inspector } from '@observablehq/inspector';
	import type { ReactiveCell } from '$lib/client/model/cell';
	import type { ObservableValue } from '$lib/common/lib/runtime';

	let { cell } = $props<{
		cell: ReactiveCell;
	}>();

	let observerID: number | undefined = $state(undefined);
	let container: HTMLElement;
	let inspector: Inspector | undefined = $state(undefined);
	let renderedContent: string = $state('');

	function names(): string | undefined {
		const n = cell.names().join(', ');

		return n.length > 0 ? n : undefined;
	}

	onMount(() => {
		if (container) {
			inspector = new Inspector(container);

			observerID = cell.defaultObservers().addObserver({
				fulfilled(value: ObservableValue): void {
					if (value instanceof SVGElement) {
						renderedContent = value.outerHTML;
					} else if (inspector) {
						inspector.fulfilled(value, names());
					}
				},
				pending(): void {
					if (inspector) {
						inspector.pending();
					}
				},
				rejected(value?: ObservableValue): void {
					if (inspector) {
						inspector.rejected(value === null ? null : value, names());
					}
				}
			});
		}
	});

	onDestroy(() => {
		if (observerID !== undefined) {
			cell.defaultObservers().removeObserver(observerID);
		}
	});
</script>

<div bind:this={container}>
	{#if renderedContent}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html renderedContent}
	{/if}
</div>
