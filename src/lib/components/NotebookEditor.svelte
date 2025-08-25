<script lang="ts">
	import CellEditor from './CellEditor.svelte';
	import AddCellBetween from './AddCellBetween.svelte';
	import type { Notebook } from '$lib/types/cell';

	interface Props {
		notebook: Notebook;
	}

	let { notebook }: Props = $props();
</script>

<div class="notebook-editor">
	{#each notebook.cells as cell, index (cell.id)}
		<AddCellBetween
			cellBeforeId={index > 0 ? notebook.cells[index - 1].id : undefined}
			cellAfterId={cell.id}
		/>

		<CellEditor {notebook} {cell} />
	{/each}

	<AddCellBetween
		cellBeforeId={notebook.cells.length > 0
			? notebook.cells[notebook.cells.length - 1].id
			: undefined}
		cellAfterId={undefined}
	/>
</div>
