<script lang="ts">
	import TopBar from '$lib/components/TopBar.svelte';
	import FooterBar from '$lib/components/FooterBar.svelte';
	import NotebookEditor from '$lib/components/NotebookEditor.svelte';
	import { createNotebookStore, type NotebookStore } from '$lib/stores/notebook';
	import { ReactiveNotebook } from '$lib/types/cell';
	import { onMount } from 'svelte';

	let notebookStore: NotebookStore | undefined;
	let isInitialized = false;

	onMount(async () => {
		// Create a notebook with Observable features
		const notebook = new ReactiveNotebook({ title: 'Interactive Observable Demo' });
		notebookStore = createNotebookStore(notebook);

		// Add demo cells showcasing Observable features
		await addDemoCells();
		isInitialized = true;
	});

	async function addDemoCells() {
		if (!notebookStore) return;

		// Cell 1: Define a simple value
		await notebookStore.addCell({
			kind: 'js',
			value: `42`
		});

		// Cell 2: Another simple value
		await notebookStore.addCell({
			kind: 'js',
			value: `"Hello World"`
		});

		// Cell 3: Simple calculation
		await notebookStore.addCell({
			kind: 'js',
			value: `2 + 2`
		});

		// Cell 4: Display results
		await notebookStore.addCell({
			kind: 'md',
			value: `# Reactive Demo

This demo shows basic cell execution. Try editing any cell and watch it update!

**Cell 1 result:** {cell_1}
**Cell 2 result:** {cell_2}
**Cell 3 result:** {cell_3}`
		});

		// Cell 5: Simple HTML
		await notebookStore.addCell({
			kind: 'html',
			value: `<div style="padding: 1rem; background: #f0f0f0; border-radius: 8px;">
  <h3>Live Results</h3>
  <p><strong>Cell 1:</strong> {cell_1}</p>
  <p><strong>Cell 2:</strong> {cell_2}</p>
  <p><strong>Cell 3:</strong> {cell_3}</p>
</div>`
		});
	}

	// Add new cell function for testing
	async function addTestCell() {
		if (!notebookStore) return;

		await notebookStore.addCell({
			kind: 'js',
			value: `// Test cell added at ${new Date().toLocaleTimeString()}
const testValue = Math.random() * 100;
const testData = Array.from({length: 5}, () => Math.random());

{
  testValue: testValue.toFixed(2),
  testData,
  timestamp: new Date().toISOString()
}`
		});
	}

	// Clear all cells function
	async function clearAllCells() {
		if (!notebookStore) return;

		const cells = [...notebookStore.notebook.cells];
		for (const cell of cells) {
			notebookStore.removeCell(cell.id);
		}
	}

	// Run all cells function
	async function runAllCells() {
		if (!notebookStore) return;
		await notebookStore.notebook.runAllCells();
	}

	function handleTitleChange(event: CustomEvent) {
		if (notebookStore) {
			const { title } = event.detail;
			notebookStore.updateTitle(title);
		}
	}
</script>

<div class="observable-demo-page">
	{#if notebookStore}
		<TopBar title={notebookStore.notebook.title} on:titleChange={handleTitleChange} />

		<main class="demo-main">
			<div class="demo-container">
				<div class="demo-header">
					<h1>🚀 Interactive Observable Demo</h1>
					<p>
						This demo showcases <strong>real-time reactive features</strong> with ObservableHQ integration.
						Try adjusting the interactive controls to see live updates!
					</p>

					{#if isInitialized}
						<div class="demo-controls">
							<button class="control-btn primary" on:click={runAllCells}> 🔄 Run All Cells </button>
							<button class="control-btn secondary" on:click={addTestCell}>
								➕ Add Test Cell
							</button>
							<button class="control-btn danger" on:click={clearAllCells}> 🗑️ Clear All </button>
						</div>
					{/if}
				</div>

				{#if isInitialized}
					<div class="demo-status">
						<span class="status-indicator active">● Live</span>
						<span class="status-text">Real-time updates enabled</span>
					</div>
				{/if}

				<NotebookEditor {notebookStore} />
			</div>
		</main>
	{:else}
		<div class="loading-container">
			<div class="loading-spinner"></div>
			<p>Loading Interactive Observable Demo...</p>
		</div>
	{/if}

	<FooterBar />
</div>

<style>
	.observable-demo-page {
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

	.demo-header {
		padding: 2rem 1rem 1rem;
		text-align: center;
		border-bottom: 1px solid var(--color-gray-200);
		margin-bottom: 1rem;
	}

	.demo-header h1 {
		font-size: 1.875rem;
		font-weight: 700;
		color: var(--color-gray-900);
		margin-bottom: 0.5rem;
	}

	.demo-header p {
		font-size: 1rem;
		color: var(--color-gray-600);
		max-width: 600px;
		margin: 0 auto 1.5rem;
	}

	.demo-controls {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		flex-wrap: wrap;
		margin-top: 1rem;
	}

	.control-btn {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease-in-out;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.control-btn.primary {
		background-color: var(--color-blue-500);
		color: white;
	}

	.control-btn.primary:hover {
		background-color: var(--color-blue-600);
		transform: translateY(-1px);
	}

	.control-btn.secondary {
		background-color: var(--color-gray-100);
		color: var(--color-gray-700);
		border: 1px solid var(--color-gray-300);
	}

	.control-btn.secondary:hover {
		background-color: var(--color-gray-200);
		transform: translateY(-1px);
	}

	.control-btn.danger {
		background-color: var(--color-red-500);
		color: white;
	}

	.control-btn.danger:hover {
		background-color: var(--color-red-600);
		transform: translateY(-1px);
	}

	.demo-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background-color: var(--color-green-50);
		border: 1px solid var(--color-green-200);
		border-radius: 0.375rem;
		margin-bottom: 1rem;
	}

	.status-indicator {
		font-size: 1.25rem;
		animation: pulse 2s infinite;
	}

	.status-indicator.active {
		color: var(--color-green-500);
	}

	.status-text {
		font-size: 0.875rem;
		color: var(--color-green-700);
		font-weight: 500;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		gap: 1rem;
	}

	.loading-spinner {
		width: 2rem;
		height: 2rem;
		border: 3px solid var(--color-gray-200);
		border-top: 3px solid var(--color-blue-500);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
</style>
