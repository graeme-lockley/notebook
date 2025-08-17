<script lang="ts">
	import RenderedCell from './RenderedCell.svelte';
	import type { Cell } from '$lib/types/cell';

	interface Props {
		cell: Cell;
	}

	let { cell }: Props = $props();
</script>

<div class="notebook-editor-row">
	<RenderedCell {cell} />

	<!-- {#if !cell.isClosed}
		<SourceContent
			id={cell.id}
			kind={cell.kind}
			value={cell.value}
			isFocused={cell.isFocused}
			on:valueChange={handleCellValueChange}
			on:run={handleCellRun}
		/>
	{/if} -->
</div>
