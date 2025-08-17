<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import CellShell from './CellShell.svelte';
	import SourceContent from './SourceContent.svelte';
	import OutputPanel from './OutputPanel.svelte';
	import type { Cell } from '$lib/types/cell';

	interface Props {
		cell: Cell;
	}

	let { cell }: Props = $props();
	const dispatch = createEventDispatcher();

	function handleCellFocus(event: CustomEvent) {
		const { id } = event.detail;
		dispatch('focus', { id });
	}

	function handleCellValueChange(event: CustomEvent) {
		const { id, value } = event.detail;
		dispatch('valueChange', { id, value });
	}

	async function handleCellRun(event: CustomEvent) {
		const { id } = event.detail;
		console.log(`Running cell ${id}`);
		dispatch('run', { id });
	}

	function handlePinToggle(event: CustomEvent) {
		const { id, pinned } = event.detail;
		dispatch('pinToggle', { id, pinned });
	}

	function handleToggleClosed(event: CustomEvent) {
		const { id } = event.detail;
		dispatch('toggleClosed', { id });
	}
</script>

<CellShell
	id={cell.id}
	kind={cell.kind}
	isFocused={cell.isFocused}
	isPinned={cell.isPinned}
	hasError={cell.hasError}
	isClosed={cell.isClosed}
	on:focus={handleCellFocus}
	on:pinToggle={handlePinToggle}
	on:toggleClosed={handleToggleClosed}
>
	<!-- Output Panel (always visible, above editor) -->
	<OutputPanel
		id={cell.id}
		status={cell.status}
		valueHtml={cell.valueHtml}
		error={cell.hasError ? 'Example error message' : null}
		console={cell.console}
		isClosed={cell.isClosed}
	/>

	<!-- Cell Editor (only visible when not closed) -->
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
</CellShell>
