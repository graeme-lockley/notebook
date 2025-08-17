<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import SourceContent from './SourceContent.svelte';
	import RenderedCell from './RenderedCell.svelte';
	import type { Cell } from '$lib/types/cell';

	interface Props {
		cell: Cell;
	}

	let { cell }: Props = $props();
	const dispatch = createEventDispatcher();

	// function handleCellFocus(event: CustomEvent) {
	// 	const { id } = event.detail;
	// 	dispatch('focus', { id });
	// }

	function handleCellValueChange(event: CustomEvent) {
		const { id, value } = event.detail;
		dispatch('valueChange', { id, value });
	}

	async function handleCellRun(event: CustomEvent) {
		const { id } = event.detail;
		console.log(`Running cell ${id}`);
		dispatch('run', { id });
	}

	// function handlePinToggle(event: CustomEvent) {
	// 	const { id, pinned } = event.detail;
	// 	dispatch('pinToggle', { id, pinned });
	// }

	// function handleToggleClosed(event: CustomEvent) {
	// 	const { id } = event.detail;
	// 	dispatch('toggleClosed', { id });
	// }
</script>

<div>
	<RenderedCell {cell} />

	{#if !cell.isClosed}
		<SourceContent
			id={cell.id}
			kind={cell.kind}
			value={cell.value}
			isFocused={cell.isFocused}
			on:valueChange={handleCellValueChange}
			on:run={handleCellRun}
		/>
	{/if}
</div>
