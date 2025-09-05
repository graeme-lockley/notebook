<script lang="ts">
	import CellEditor from './CellEditor.svelte';
	import AddCellBetween from './AddCellBetween.svelte';
	import type {
		CellCreatedEvent,
		OnFocusEvent,
		SourceKindChangeEvent,
		SourceValueChangeEvent,
		DeleteCellEvent,
		MoveCellUpEvent,
		MoveCellDownEvent,
		DuplicateCellEvent
	} from './event-types';
	import type { NotebookStore } from '$lib/stores/notebook';

	interface Props {
		notebookStore: NotebookStore;
		addCellToServer?: (
			kind: 'js' | 'md' | 'html',
			value: string,
			position: number
		) => Promise<void>;
		updateCellOnServer?: (
			cellId: string,
			updates: { kind?: string; value?: string }
		) => Promise<void>;
		deleteCellOnServer?: (cellId: string) => Promise<void>;
		moveCellOnServer?: (cellId: string, direction: 'up' | 'down') => Promise<void>;
		duplicateCellOnServer?: (cellId: string) => Promise<void>;
	}

	let {
		notebookStore,
		addCellToServer,
		updateCellOnServer,
		deleteCellOnServer,
		moveCellOnServer,
		duplicateCellOnServer
	}: Props = $props();

	async function handleCellCreated(event: CustomEvent<CellCreatedEvent>) {
		if (addCellToServer) {
			// Use server-driven approach
			const { cellKind, cellBeforeId, cellAfterId } = event.detail;

			// Get the current cells array from the store
			const currentCells = $notebookStore.cells;

			// Calculate position based on where the cell should be inserted
			let position: number;
			if (cellBeforeId) {
				// Insert after the cellBeforeId
				const beforeIndex = currentCells.findIndex((cell) => cell.id === cellBeforeId);
				position = beforeIndex + 1;
			} else if (cellAfterId) {
				// Insert before the cellAfterId
				const afterIndex = currentCells.findIndex((cell) => cell.id === cellAfterId);
				position = afterIndex;
			} else {
				// Insert at the end
				position = currentCells.length;
			}

			// Default cell content based on kind
			const defaultContent = getDefaultCellContent(cellKind);

			// Call server API - the event stream will update the UI
			await addCellToServer(cellKind, defaultContent, position);
		} else {
			// Fallback to local approach (for demo pages, etc.)
			notebookStore.addCell({
				kind: event.detail.cellKind,
				relativeToId: event.detail.cellBeforeId || event.detail.cellAfterId,
				position: event.detail.cellBeforeId ? 'below' : 'above',
				focus: true
			});
		}
	}

	function getDefaultCellContent(kind: 'js' | 'md' | 'html'): string {
		switch (kind) {
			case 'js':
				return 'Math.PI';
			case 'md':
				return '# Markdown cell\n\nStart typing your markdown here...';
			case 'html':
				return '<div>\n  <h1>HTML cell</h1>\n  <p>Start typing your HTML here...</p>\n</div>';
			default:
				return '';
		}
	}

	function handleOnFocus(event: CustomEvent<OnFocusEvent>) {
		notebookStore.setFocus(event.detail.cellId);
	}

	async function handleSourceKindChange(event: CustomEvent<SourceKindChangeEvent>) {
		if (updateCellOnServer) {
			await updateCellOnServer(event.detail.id, { kind: event.detail.kind });
		} else {
			notebookStore.updateCell(event.detail.id, { kind: event.detail.kind });
		}
	}

	async function handleSourceValueChange(event: CustomEvent<SourceValueChangeEvent>) {
		if (updateCellOnServer) {
			await updateCellOnServer(event.detail.id, { value: event.detail.value });
		} else {
			notebookStore.updateCell(event.detail.id, { value: event.detail.value });
		}
	}

	async function handleDeleteCell(event: CustomEvent<DeleteCellEvent>) {
		if (deleteCellOnServer) {
			await deleteCellOnServer(event.detail.id);
		} else {
			notebookStore.removeCell(event.detail.id);
		}
	}

	async function handleMoveCellUp(event: CustomEvent<MoveCellUpEvent>) {
		if (moveCellOnServer) {
			await moveCellOnServer(event.detail.id, 'up');
		} else {
			notebookStore.moveCellUp(event.detail.id);
		}
	}

	async function handleMoveCellDown(event: CustomEvent<MoveCellDownEvent>) {
		if (moveCellOnServer) {
			await moveCellOnServer(event.detail.id, 'down');
		} else {
			notebookStore.moveCellDown(event.detail.id);
		}
	}

	async function handleDuplicateCell(event: CustomEvent<DuplicateCellEvent>) {
		if (duplicateCellOnServer) {
			await duplicateCellOnServer(event.detail.id);
		} else {
			notebookStore.duplicateCell(event.detail.id);
		}
	}
</script>

<div class="notebook-editor">
	{#each $notebookStore.cells as cell, index (cell.id)}
		<AddCellBetween
			cellBeforeId={index > 0 ? $notebookStore.cells[index - 1].id : undefined}
			cellAfterId={cell.id}
			focusedCellId={$notebookStore.focusedCell?.id}
			on:CellCreated={handleCellCreated}
		/>

		<CellEditor
			{notebookStore}
			{cell}
			focusedCellId={$notebookStore.focusedCell?.id}
			on:OnFocus={handleOnFocus}
			on:SourceKindChange={handleSourceKindChange}
			on:SourceValueChange={handleSourceValueChange}
			on:DeleteCell={handleDeleteCell}
			on:MoveCellUp={handleMoveCellUp}
			on:MoveCellDown={handleMoveCellDown}
			on:DuplicateCell={handleDuplicateCell}
		/>
	{/each}

	<AddCellBetween
		cellBeforeId={$notebookStore.cells.length > 0
			? $notebookStore.cells[$notebookStore.cells.length - 1].id
			: undefined}
		cellAfterId={undefined}
		focusedCellId={$notebookStore.focusedCell?.id}
		on:CellCreated={handleCellCreated}
	/>
</div>
