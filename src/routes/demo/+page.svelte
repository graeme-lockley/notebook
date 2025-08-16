<script lang="ts">
	import TopBar from '$lib/components/TopBar.svelte';
	import FooterBar from '$lib/components/FooterBar.svelte';
	import CellShell from '$lib/components/CellShell.svelte';
	import CellEditor from '$lib/components/CellEditor.svelte';
	import AddCellBetween from '$lib/components/AddCellBetween.svelte';
	import OutputPanel from '$lib/components/OutputPanel.svelte';
	import { Notebook } from '$lib/types/cell';
	import { createDemoNotebook } from './cells-data';

	// Initialize notebook with demo data
	let notebook = $state<Notebook>(createDemoNotebook());

	function handleCellFocus(event: CustomEvent) {
		const { id } = event.detail;
		notebook.setFocus(id);
	}

	function handleCellValueChange(event: CustomEvent) {
		const { id, value } = event.detail;
		notebook.updateCell(id, { value });
	}

	async function handleCellRun(event: CustomEvent) {
		const { id } = event.detail;
		console.log(`Running cell ${id}`);
		await notebook.runCell(id);
	}

	function handlePinToggle(event: CustomEvent) {
		const { id, pinned } = event.detail;
		notebook.updateCell(id, { isPinned: pinned });
	}

	function handleAddCell(event: CustomEvent) {
		const { position, cellId } = event.detail;
		console.log(`Adding cell ${position} ${cellId}`);
	}

	function handleSelectType(event: CustomEvent) {
		const { type, position, cellId } = event.detail;
		console.log(`Selected type ${type} for position ${position} relative to ${cellId}`);

		// Add new cell using notebook
		notebook.addCell({
			kind: type,
			position: position === 'above' ? 'above' : 'below',
			relativeToId: cellId,
			focus: false
		});
	}

	function handleTitleChange(event: CustomEvent) {
		const { title } = event.detail;
		notebook.updateTitle(title);
	}

	function handleToggleClosed(event: CustomEvent) {
		const { id } = event.detail;
		notebook.toggleClosed(id);
	}
</script>

<div class="demo-page">
	<TopBar title={notebook.title} on:titleChange={handleTitleChange} />

	<main class="demo-main">
		<div class="demo-container">
			<div>
				{#each notebook.cells as cell (cell.id)}
					<AddCellBetween
						position="between"
						cellId={cell.id}
						on:addCell={handleAddCell}
						on:selectType={handleSelectType}
					/>

					<CellShell
						id={cell.id}
						kind={cell.kind}
						isFocused={cell.isFocused}
						isPinned={cell.isPinned}
						hasError={cell.hasError}
						isClosed={cell.isClosed}
						on:focus={handleCellFocus}
						on:pinToggle={handlePinToggle}
						on:toggleClosed={handleToggleClosed}
					>
						<!-- Output Panel (always visible, above editor) -->
						<OutputPanel
							id={cell.id}
							status={cell.status}
							valueHtml={cell.valueHtml}
							error={cell.hasError ? 'Example error message' : null}
							console={cell.console}
							isClosed={cell.isClosed}
						/>

						<!-- Cell Editor (only visible when not closed) -->
						{#if !cell.isClosed}
							<CellEditor
								id={cell.id}
								kind={cell.kind}
								value={cell.value}
								isFocused={cell.isFocused}
								on:valueChange={handleCellValueChange}
								on:run={handleCellRun}
							/>
						{/if}
					</CellShell>
				{/each}

				<!-- Add Cell After Last -->
				<AddCellBetween
					position="between"
					cellId={notebook.cells[notebook.cells.length - 1]?.id || 'end'}
					on:addCell={handleAddCell}
					on:selectType={handleSelectType}
				/>
			</div>
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
