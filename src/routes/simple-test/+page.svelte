<script lang="ts">
	import { ReactiveNotebook } from '$lib/types/cell';
	import { createNotebookStore, type NotebookStore } from '$lib/stores/notebook';
	import { onMount } from 'svelte';

	let notebookStore: NotebookStore;

	onMount(async () => {
		// Create a simple test notebook
		const notebook = new ReactiveNotebook({ title: 'Simple Test' });
		notebookStore = createNotebookStore(notebook);
	});

	async function addCell() {
		if ($notebookStore) {
			await notebookStore.addCell({
				kind: 'js',
				value: 'console.log("Hello!");',
				focus: true
			});
		}
	}
</script>

<div style="padding: 2rem;">
	<h1>Simple Reactivity Test</h1>

	{#if $notebookStore}
		<div style="margin: 1rem 0;">
			<p><strong>Version:</strong> {$notebookStore.version}</p>
			<p><strong>Cells:</strong> {$notebookStore.cells.length}</p>
			<p><strong>Title:</strong> {$notebookStore.title}</p>
		</div>

		<button
			onclick={addCell}
			style="padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;"
		>
			Add Cell
		</button>

		<div style="margin-top: 1rem;">
			<h3>Cells:</h3>
			{#each $notebookStore.cells as cell (cell.id)}
				<div style="padding: 0.5rem; margin: 0.25rem 0; background: #f8f9fa; border-radius: 4px;">
					{cell.id} - {cell.kind}
				</div>
			{/each}
		</div>
	{:else}
		<p>Loading...</p>
	{/if}
</div>
