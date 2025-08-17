<script lang="ts">
	import CellEditor from './CellEditor.svelte';
	import AddCellBetween from './AddCellBetween.svelte';
	import type { Notebook } from '$lib/types/cell';

	interface Props {
		notebook: Notebook;
	}

	let { notebook }: Props = $props();

	function handleAddCell(event: CustomEvent) {
		const { position, cellId } = event.detail;
		console.log(`Adding cell ${position} ${cellId}`);
	}

	function handleSelectType(event: CustomEvent) {
		const { type, position, cellId } = event.detail;
		console.log(`Selected type ${type} for position ${position} relative to ${cellId}`);

		// Add new cell using notebook
		notebook.addCell({
			kind: type,
			position: position === 'above' ? 'above' : 'below',
			relativeToId: cellId,
			focus: false
		});
	}

	function handleCellFocus(event: CustomEvent) {
		const { id } = event.detail;
		notebook.setFocus(id);
	}

	function handleCellValueChange(event: CustomEvent) {
		const { id, value } = event.detail;
		notebook.updateCell(id, { value });
	}

	async function handleCellRun(event: CustomEvent) {
		const { id } = event.detail;
		await notebook.runCell(id);
	}

	function handlePinToggle(event: CustomEvent) {
		const { id, pinned } = event.detail;
		notebook.updateCell(id, { isPinned: pinned });
	}

	function handleToggleClosed(event: CustomEvent) {
		const { id } = event.detail;
		notebook.toggleClosed(id);
	}
</script>

<div class="notebook-editor">
	{#each notebook.cells as cell (cell.id)}
		<AddCellBetween
			position="between"
			cellId={cell.id}
			on:addCell={handleAddCell}
			on:selectType={handleSelectType}
		/>

		<CellEditor
			{cell}
			on:focus={handleCellFocus}
			on:valueChange={handleCellValueChange}
			on:run={handleCellRun}
			on:pinToggle={handlePinToggle}
			on:toggleClosed={handleToggleClosed}
		/>
	{/each}

	<!-- Add Cell After Last -->
	<AddCellBetween
		position="between"
		cellId={notebook.cells[notebook.cells.length - 1]?.id || 'end'}
		on:addCell={handleAddCell}
		on:selectType={handleSelectType}
	/>
</div>
