<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import RenderedCell from './RenderedCell.svelte';
	import SourceCell from './SourceCell.svelte';
	import type { Notebook, Cell } from '$lib/types/cell';
	import type { ToggleSourceViewEvent, OnFocusEvent } from './event-types';

	interface Props {
		notebook: Notebook;
		cell: Cell;
		focusedCellId: string | undefined;
	}

	let { notebook, cell, focusedCellId }: Props = $props();

	let isClosed = $derived(cell.isClosed);
	let isFocused = $derived(cell.id === focusedCellId);

	const dispatch = createEventDispatcher<{
		OnFocus: OnFocusEvent;
	}>();

	function handleToggleSourceView(event: CustomEvent<ToggleSourceViewEvent>) {
		notebook.toggleClosed(event.detail.cellId);
		isClosed = cell.isClosed;
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
