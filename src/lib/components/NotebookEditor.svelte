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
	{#each notebook.cells as cell (cell.id)}
		<AddCellBetween />

		<CellEditor {cell} />
	{/each}

	<AddCellBetween />
</div>
