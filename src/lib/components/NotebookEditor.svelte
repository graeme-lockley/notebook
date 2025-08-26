<script lang="ts">
	import CellEditor from './CellEditor.svelte';
	import AddCellBetween from './AddCellBetween.svelte';
	import type { CellCreatedEvent, OnFocusEvent, SourceValueChangeEvent } from './event-types';
	import type { NotebookStore } from '$lib/stores/notebook';

	interface Props {
		notebookStore: NotebookStore;
	}

	let { notebookStore }: Props = $props();

	function handleCellCreated(event: CustomEvent<CellCreatedEvent>) {
		notebookStore.addCell({
			kind: event.detail.cellKind,
			relativeToId: event.detail.cellBeforeId || event.detail.cellAfterId,
			position: event.detail.cellBeforeId ? 'below' : 'above',
			focus: true
		});

		console.log('NotebookEditor: CellCreated:', $notebookStore.cells);
	}

	function handleOnFocus(event: CustomEvent<OnFocusEvent>) {
		notebookStore.setFocus(event.detail.cellId);
	}

	function handleSourceValueChange(event: CustomEvent<SourceValueChangeEvent>) {
		notebookStore.updateCell(event.detail.id, { value: event.detail.value });
	}
</script>

<div class="notebook-editor">
	{#each $notebookStore.cells as cell, index (cell.id)}
		<AddCellBetween
			cellBeforeId={index > 0 ? $notebookStore.cells[index - 1].id : undefined}
			cellAfterId={cell.id}
			focusedCellId={$notebookStore.focusedCell?.id}
			on:CellCreated={handleCellCreated}
		/>

		<CellEditor
			{notebookStore}
			{cell}
			focusedCellId={$notebookStore.focusedCell?.id}
			on:OnFocus={handleOnFocus}
			on:SourceValueChange={handleSourceValueChange}
		/>
	{/each}

	<AddCellBetween
		cellBeforeId={$notebookStore.cells.length > 0
			? $notebookStore.cells[$notebookStore.cells.length - 1].id
			: undefined}
		cellAfterId={undefined}
		focusedCellId={$notebookStore.focusedCell?.id}
		on:CellCreated={handleCellCreated}
	/>
</div>
