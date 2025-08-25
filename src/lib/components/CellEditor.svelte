<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import RenderedCell from './RenderedCell.svelte';
	import SourceCell from './SourceCell.svelte';
	import type { Cell } from '$lib/types/cell';
	import type { ToggleSourceViewEvent, OnFocusEvent } from './event-types';
	import { type NotebookStore } from '$lib/stores/notebook';

	interface Props {
		notebookStore: NotebookStore;
		cell: Cell;
		focusedCellId: string | undefined;
	}

	let { notebookStore, cell, focusedCellId }: Props = $props();

	let isClosed = $derived(cell.isClosed);
	let isFocused = $derived(cell.id === focusedCellId);

	const dispatch = createEventDispatcher<{
		OnFocus: OnFocusEvent;
	}>();

	function handleToggleSourceView(event: CustomEvent<ToggleSourceViewEvent>) {
		notebookStore.toggleClosed(event.detail.cellId);
	}

	function handleOnFocus() {
		dispatch('OnFocus', { cellId: cell.id });
	}
</script>

<div
	class="notebook-editor-row"
	role="button"
	tabindex="0"
	onmouseenter={handleOnFocus}
	onfocus={handleOnFocus}
>
	<RenderedCell {isClosed} {isFocused} {cell} on:ToggleSourceView={handleToggleSourceView} />

	{#if !isClosed}
		<SourceCell {isFocused} {cell} />
	{/if}
</div>
