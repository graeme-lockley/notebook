<script lang="ts">
	import RenderedCell from './RenderedCell.svelte';
	import SourceCell from './SourceCell.svelte';
	import type { Notebook, Cell } from '$lib/types/cell';
	import type { ToggleSourceViewEvent } from './event-types';

	interface Props {
		notebook: Notebook;
		cell: Cell;
	}

	let { notebook, cell }: Props = $props();
	let isClosed = $derived(cell.isClosed);
	let isFocused = $derived(cell.isFocused);

	function handleToggleSourceView(event: CustomEvent<ToggleSourceViewEvent>) {
		notebook.toggleClosed(event.detail.cellId);
		isClosed = cell.isClosed;
	}

	function handleOnFocus() {
		notebook.setFocus(cell.id);
		isFocused = cell.isFocused;
	}

	function handleLooseFocus() {
		notebook.clearFocus();
		isFocused = cell.isFocused;
	}
</script>

<div
	class="notebook-editor-row"
	role="button"
	tabindex="0"
	onmouseenter={handleOnFocus}
	onmouseleave={handleLooseFocus}
	onfocus={handleOnFocus}
	onblur={handleLooseFocus}
>
	<RenderedCell {isClosed} {isFocused} {cell} on:ToggleSourceView={handleToggleSourceView} />

	{#if !isClosed}
		<SourceCell {isFocused} {cell} />
	{/if}
</div>
