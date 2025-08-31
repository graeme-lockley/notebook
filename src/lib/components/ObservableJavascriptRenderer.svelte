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

	onMount(() => {
		if (container) {
			inspector = new Inspector(container);

			observerID = cell.observers.addObserver({
				fulfilled(value: ObservableValue): void {
					if (inspector) {
						const names = cell.names().join(', ');
						inspector.fulfilled($state.snapshot(value), names.length > 0 ? names : undefined);
					}
				},
				pending(): void {
					if (inspector) {
						inspector.pending();
					}
				},
				rejected(value?: ObservableValue): void {
					if (inspector) {
						const names = cell.names().join(', ');
						inspector.rejected(
							value === null ? null : $state.snapshot(value),
							names.length > 0 ? names : undefined
						);
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
