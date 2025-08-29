<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import RenderedCell from './RenderedCell.svelte';
	import SourceCell from './SourceCell.svelte';
	import type { ReactiveCell } from '$lib/model/cell';
	import type {
		DeleteCellEvent,
		DuplicateCellEvent,
		OnFocusEvent,
		MoveCellDownEvent,
		MoveCellUpEvent,
		SourceKindChangeEvent,
		SourceValueChangeEvent,
		ToggleSourceViewEvent
	} from './event-types';
	import { type NotebookStore } from '$lib/stores/notebook';

	interface Props {
		notebookStore: NotebookStore;
		cell: ReactiveCell;
		focusedCellId: string | undefined;
	}

	let { notebookStore, cell, focusedCellId }: Props = $props();

	let isClosed = $derived(cell.isClosed);
	let isFocused = $derived(cell.id === focusedCellId);

	const dispatch = createEventDispatcher<{
		OnFocus: OnFocusEvent;
		SourceKindChange: SourceKindChangeEvent;
		SourceValueChange: SourceValueChangeEvent;
		DeleteCell: DeleteCellEvent;
		MoveCellUp: MoveCellUpEvent;
		MoveCellDown: MoveCellDownEvent;
		DuplicateCell: DuplicateCellEvent;
	}>();

	function handleToggleSourceView(event: CustomEvent<ToggleSourceViewEvent>) {
		notebookStore.toggleClosed(event.detail.cellId);
	}

	function handleOnFocus() {
		dispatch('OnFocus', { cellId: cell.id });
	}

	function handleSourceKindChange(event: CustomEvent<SourceKindChangeEvent>) {
		dispatch('SourceKindChange', event.detail);
	}

	function handleSourceValueChange(event: CustomEvent<SourceValueChangeEvent>) {
		dispatch('SourceValueChange', event.detail);
	}

	function handleDeleteCell(event: CustomEvent<DeleteCellEvent>) {
		dispatch('DeleteCell', event.detail);
	}

	function handleMoveCellUp(event: CustomEvent<MoveCellUpEvent>) {
		dispatch('MoveCellUp', event.detail);
	}

	function handleMoveCellDown(event: CustomEvent<MoveCellDownEvent>) {
		dispatch('MoveCellDown', event.detail);
	}

	function handleDuplicateCell(event: CustomEvent<DuplicateCellEvent>) {
		dispatch('DuplicateCell', event.detail);
	}
</script>

<div
	class="notebook-editor-row"
	role="button"
	tabindex="0"
	onmouseenter={handleOnFocus}
	onfocus={handleOnFocus}
>
	<RenderedCell
		{isClosed}
		{isFocused}
		{cell}
		on:ToggleSourceView={handleToggleSourceView}
		on:DeleteCell={handleDeleteCell}
		on:MoveCellUp={handleMoveCellUp}
		on:MoveCellDown={handleMoveCellDown}
		on:DuplicateCell={handleDuplicateCell}
	/>

	{#if !isClosed}
		<SourceCell
			{isFocused}
			{cell}
			on:SourceValueChange={handleSourceValueChange}
			on:SourceKindChange={handleSourceKindChange}
		/>
	{/if}
</div>
