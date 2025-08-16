<script lang="ts">
	import TopBar from '$lib/components/TopBar.svelte';
	import FooterBar from '$lib/components/FooterBar.svelte';
	import NotebookEditor from '$lib/components/NotebookEditor.svelte';
	import { Notebook } from '$lib/types/cell';
	import { createDemoNotebook } from './cells-data';

	// Initialize notebook with demo data
	let notebook = $state<Notebook>(createDemoNotebook());

	function handleTitleChange(event: CustomEvent) {
		const { title } = event.detail;
		notebook.updateTitle(title);
	}
</script>

<div class="demo-page">
	<TopBar title={notebook.title} on:titleChange={handleTitleChange} />

	<main class="demo-main">
		<div class="demo-container">
			<NotebookEditor {notebook} />
		</div>
	</main>

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
