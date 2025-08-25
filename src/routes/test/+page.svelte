<script lang="ts">
	import { Notebook } from '$lib/types/cell';
	import NotebookEditor from '$lib/components/NotebookEditor.svelte';
	import { createNotebookStore, type NotebookStore } from '$lib/stores/notebook';

	// Create a test notebook
	const notebook = new Notebook({
		title: 'Reactivity Test',
		description: 'Testing notebook reactivity'
	});
	const notebookStore: NotebookStore = createNotebookStore(notebook);

	// Track changes for demonstration
	let changeCount = $state(0);

	function addJavaScriptCell() {
		notebookStore.addCell({
			kind: 'js',
			value: `// Cell ${$notebookStore.cells.length + 1}\nconsole.log("Hello from cell ${$notebookStore.cells.length + 1}!");\n\n\`Cell ${$notebookStore.cells.length + 1} executed\``,
			focus: true
		});
		changeCount++;
	}

	function addMarkdownCell() {
		notebookStore.addCell({
			kind: 'md',
			value: `# Cell ${$notebookStore.cells.length + 1}\n\nThis is a **markdown** cell added at ${new Date().toLocaleTimeString()}.`,
			focus: true
		});
		changeCount++;
	}

	function addHTMLCell() {
		notebookStore.addCell({
			kind: 'html',
			value: `<div style="padding: 1rem; background: #f0f0f0; border-radius: 4px;">\n  <h3>Cell ${$notebookStore.cells.length + 1}</h3>\n  <p>This is an HTML cell added at ${new Date().toLocaleTimeString()}.</p>\n</div>`,
			focus: true
		});
		changeCount++;
	}

	function clearCells() {
		while ($notebookStore.cells.length > 0) {
			notebookStore.removeCell($notebookStore.cells[0].id);
		}
		changeCount++;
	}
</script>

<div class="test-page">
	<header class="test-header">
		<h1>Notebook Reactivity Test</h1>
		<div class="test-stats">
			<p><strong>Notebook Version:</strong> {$notebookStore.version}</p>
			<p><strong>Number of Cells:</strong> {$notebookStore.cells.length}</p>
			<p><strong>Change Count:</strong> {changeCount}</p>
			<p><strong>Last Updated:</strong> {notebookStore.notebook.updatedAt.toLocaleTimeString()}</p>
		</div>
		<div class="test-actions">
			<button onclick={addJavaScriptCell} class="test-button js">Add JS Cell</button>
			<button onclick={addMarkdownCell} class="test-button md">Add MD Cell</button>
			<button onclick={addHTMLCell} class="test-button html">Add HTML Cell</button>
			<button onclick={clearCells} class="test-button clear">Clear All</button>
		</div>
	</header>

	<main class="test-main">
		<NotebookEditor {notebookStore} />
	</main>
</div>

<style>
	.test-page {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background-color: var(--color-white);
	}

	.test-header {
		padding: 1rem;
		background-color: #f8f9fa;
		border-bottom: 1px solid #e9ecef;
	}

	.test-header h1 {
		margin: 0 0 1rem 0;
		font-size: 1.5rem;
		font-weight: 600;
	}

	.test-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.test-stats p {
		margin: 0;
		font-size: 0.875rem;
		color: #6c757d;
	}

	.test-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.test-button {
		padding: 0.5rem 1rem;
		border: 1px solid #dee2e6;
		border-radius: 0.375rem;
		background-color: white;
		color: #495057;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.15s ease-in-out;
	}

	.test-button:hover {
		background-color: #e9ecef;
		border-color: #adb5bd;
	}

	.test-button.js {
		background-color: #f8f9fa;
		border-color: #007bff;
		color: #007bff;
	}

	.test-button.js:hover {
		background-color: #007bff;
		color: white;
	}

	.test-button.md {
		background-color: #f8f9fa;
		border-color: #28a745;
		color: #28a745;
	}

	.test-button.md:hover {
		background-color: #28a745;
		color: white;
	}

	.test-button.html {
		background-color: #f8f9fa;
		border-color: #fd7e14;
		color: #fd7e14;
	}

	.test-button.html:hover {
		background-color: #fd7e14;
		color: white;
	}

	.test-button.clear {
		background-color: #f8f9fa;
		border-color: #dc3545;
		color: #dc3545;
	}

	.test-button.clear:hover {
		background-color: #dc3545;
		color: white;
	}

	.test-main {
		flex: 1;
		padding: 1rem;
	}
</style>
