<script lang="ts">
	import TopBar from '$lib/components/TopBar.svelte';
	import FooterBar from '$lib/components/FooterBar.svelte';
	import NotebookEditor from '$lib/components/NotebookEditor.svelte';
	import { createNotebookStore, type NotebookStore } from '$lib/stores/notebook';
	import { createDemoNotebook } from './cells-data';
	import { onMount } from 'svelte';

	let notebookStore: NotebookStore | undefined;

	onMount(async () => {
		// Create notebook and wrap it in a reactive store
		const notebook = await createDemoNotebook();
		notebookStore = createNotebookStore(notebook);
	});

	function handleTitleChange(event: CustomEvent) {
		if (notebookStore) {
			const { title } = event.detail;
			notebookStore.updateTitle(title);
		}
	}
</script>

<div class="demo-page">
	{#if notebookStore}
		<TopBar title={notebookStore.notebook.title} on:titleChange={handleTitleChange} />

		<main class="demo-main">
			<div class="demo-container">
				<NotebookEditor {notebookStore} />
			</div>
		</main>
	{:else}
		<div style="padding: 2rem; text-align: center;">
			<p>Loading...</p>
		</div>
	{/if}

	<FooterBar />
</div>

<style>
	.demo-page {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background-color: var(--color-white);
	}

	.demo-main {
		flex: 1;
		overflow: auto;
	}

	.demo-container {
		margin: 0 auto;
		max-width: var(--max-width);
	}
</style>
