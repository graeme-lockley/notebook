<script lang="ts">
	import CellEditor from './CellEditor.svelte';
	import AddCellBetween from './AddCellBetween.svelte';
	import type { Notebook } from '$lib/types/cell';
	import type { OnFocusEvent } from './event-types';

	interface Props {
		notebook: Notebook;
	}

	let { notebook }: Props = $props();
	let focusedCellId = $state(notebook.focusedCell?.id);

	function handleOnFocus(event: CustomEvent<OnFocusEvent>) {
		notebook.setFocus(event.detail.cellId);
		focusedCellId = event.detail.cellId;
	}
</script>

<div class="notebook-editor">
	{#each notebook.cells as cell, index (cell.id)}
		<AddCellBetween
			cellBeforeId={index > 0 ? notebook.cells[index - 1].id : undefined}
			cellAfterId={cell.id}
			{focusedCellId}
		/>

		<CellEditor {notebook} {cell} {focusedCellId} on:OnFocus={handleOnFocus} />
	{/each}

	<AddCellBetween
		cellBeforeId={notebook.cells.length > 0
			? notebook.cells[notebook.cells.length - 1].id
			: undefined}
		cellAfterId={undefined}
		{focusedCellId}
	/>
</div>
