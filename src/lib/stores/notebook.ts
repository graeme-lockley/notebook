import { writable, derived, type Readable } from 'svelte/store';
import type { ReactiveNotebook, ReactiveCell, AddCellOptions } from '$lib/model/cell';

// Define the store interface - export it properly
export interface NotebookStore {
	subscribe: Readable<ReactiveNotebook>['subscribe'];
	set: (value: ReactiveNotebook) => void;
	update: (fn: (notebook: ReactiveNotebook) => ReactiveNotebook) => void;
	cells: Readable<readonly ReactiveCell[]>;
	focusedCell: Readable<ReactiveCell | null>;
	version: Readable<number>;
	addCell: (options?: AddCellOptions) => Promise<void>;
	removeCell: (id: string) => Promise<void>;
	updateCell: (id: string, updates: Partial<Omit<ReactiveCell, 'id'>>) => Promise<void>;
	setFocus: (id: string) => void;
	toggleClosed: (id: string) => void;
	moveCellUp: (id: string) => void;
	moveCellDown: (id: string) => void;
	duplicateCell: (id: string) => Promise<void>;
	updateTitle: (title: string) => void;
	notebook: ReactiveNotebook;
}

// Create a reactive notebook store
export function createNotebookStore(notebook: ReactiveNotebook): NotebookStore {
	const { subscribe, set, update } = writable(notebook);

	// Keep a reference to the current notebook value for SSR compatibility
	const currentNotebook = notebook;

	// Create a separate writable store for cells to ensure reactivity
	const { subscribe: cellsSubscribe, set: setCells } = writable(notebook.cells);
	const focusedCell = derived({ subscribe }, ($notebook) => $notebook.focusedCell);
	const version = derived({ subscribe }, ($notebook) => $notebook.version || 0);

	// Update cells store whenever notebook changes
	subscribe(($notebook) => {
		setCells($notebook.cells);
	});

	// Wrapper methods that trigger reactivity
	async function addCell(options: AddCellOptions = {}) {
		await currentNotebook.addCell(options);
		set(currentNotebook);
	}

	async function removeCell(id: string) {
		console.log(`🔍 Store removeCell called with id: ${id}`);
		console.log(
			`🔍 Current cells before removal:`,
			currentNotebook.cells.map((c) => c.id)
		);
		const result = await currentNotebook.removeCell(id);
		console.log(`🔍 ReactiveNotebook.removeCell result:`, result);
		console.log(
			`🔍 Current cells after removal:`,
			currentNotebook.cells.map((c) => c.id)
		);
		set(currentNotebook);
		console.log(`🔍 Store set() called after removal`);
	}

	async function updateCell(id: string, updates: Partial<Omit<ReactiveCell, 'id'>>) {
		await currentNotebook.updateCell(id, updates);
		// Force reactivity by creating a new array reference
		setCells([...currentNotebook.cells]);
		set(currentNotebook);
	}

	function setFocus(id: string) {
		currentNotebook.setFocus(id);
		set(currentNotebook);
	}

	function toggleClosed(id: string) {
		currentNotebook.toggleClosed(id);
		set(currentNotebook);
	}

	function moveCellUp(id: string) {
		currentNotebook.moveCellUp(id);
		set(currentNotebook);
	}

	function moveCellDown(id: string) {
		currentNotebook.moveCellDown(id);
		set(currentNotebook);
	}

	async function duplicateCell(id: string) {
		await currentNotebook.duplicateCell(id);
		set(currentNotebook);
	}

	function updateTitle(title: string) {
		currentNotebook.updateTitle(title);
		set(currentNotebook);
	}

	const store: NotebookStore = {
		subscribe,
		set,
		update,
		cells: { subscribe: cellsSubscribe },
		focusedCell,
		version,
		addCell,
		removeCell,
		updateCell,
		setFocus,
		toggleClosed,
		moveCellUp,
		moveCellDown,
		duplicateCell,
		updateTitle,
		// Expose the current notebook value (SSR compatible)
		get notebook() {
			return currentNotebook;
		}
	};

	return store;
}
