<script lang="ts">
	import TopBar from '$lib/components/TopBar.svelte';
	import FooterBar from '$lib/components/FooterBar.svelte';
	import CellShell from '$lib/components/CellShell.svelte';
	import CellEditor from '$lib/components/CellEditor.svelte';
	import AddCellBetween from '$lib/components/AddCellBetween.svelte';
	import OutputPanel from '$lib/components/OutputPanel.svelte';
	import type { Cell } from '$lib/types/cell';
	import { initialCells } from './cells-data';

	// Initialize cells with demo data
	let cells = $state<Cell[]>(initialCells);

	function handleCellFocus(event: CustomEvent) {
		const { id } = event.detail;

		// Update focus state for all cells
		cells = cells.map((cell) => ({
			...cell,
			isFocused: cell.id === id
		}));
	}

	function handleCellValueChange(event: CustomEvent) {
		const { id, value } = event.detail;
		cells = cells.map((cell) => (cell.id === id ? { ...cell, value } : cell));
	}

	function handleCellRun(event: CustomEvent) {
		const { id } = event.detail;
		console.log(`Running cell ${id}`);

		// Update cell status to show it's running
		cells = cells.map((cell) =>
			cell.id === id ? { ...cell, status: 'pending' as 'ok' | 'error' | 'pending' } : cell
		);

		// Simulate execution delay
		setTimeout(() => {
			cells = cells.map((cell) =>
				cell.id === id ? { ...cell, status: 'ok' as 'ok' | 'error' | 'pending' } : cell
			);
		}, 1000);
	}

	function handlePinToggle(event: CustomEvent) {
		const { id, pinned } = event.detail;
		cells = cells.map((cell) => (cell.id === id ? { ...cell, isPinned: pinned } : cell));
	}

	function handleAddCell(event: CustomEvent) {
		const { position, cellId } = event.detail;
		console.log(`Adding cell ${position} ${cellId}`);
	}

	function handleSelectType(event: CustomEvent) {
		const { type, position, cellId } = event.detail;
		console.log(`Selected type ${type} for position ${position} relative to ${cellId}`);

		// Create new cell
		const newCell = {
			id: `cell-${Date.now()}`,
			kind: type,
			value:
				type === 'js'
					? '// New JavaScript cell\nconsole.log("Hello!");'
					: type === 'md'
						? '# New Markdown Cell\n\nStart typing here...'
						: '<div>New HTML Cell</div>',
			status: 'ok' as 'ok' | 'error' | 'pending',
			valueHtml:
				type === 'js'
					? '<div>Hello!</div>'
					: type === 'md'
						? '<h1>New Markdown Cell</h1><p>Start typing here...</p>'
						: '<div>New HTML Cell</div>',
			isFocused: false,
			isPinned: false,
			hasError: false,
			isClosed: true // New cells start closed
		};

		// Find the index of the reference cell
		const refIndex = cells.findIndex((cell) => cell.id === cellId);
		if (refIndex !== -1) {
			const insertIndex = position === 'above' ? refIndex : refIndex + 1;
			cells = [...cells.slice(0, insertIndex), newCell, ...cells.slice(insertIndex)];
		}
	}

	function handleTitleChange(event: CustomEvent) {
		console.log('Title changed:', event.detail);
	}

	function handleToggleClosed(event: CustomEvent) {
		const { id } = event.detail;
		cells = cells.map((cell) => (cell.id === id ? { ...cell, isClosed: !cell.isClosed } : cell));
	}
</script>

<div class="demo-page">
	<TopBar title="ObservableHQ Clone - Closed & Open Cell Demo" on:titleChange={handleTitleChange} />

	<main class="demo-main">
		<div class="demo-container">
			<div>
				{#each cells as cell (cell.id)}
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
					cellId={cells[cells.length - 1]?.id || 'end'}
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
