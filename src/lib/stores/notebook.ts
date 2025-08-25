import { writable, derived, type Readable } from 'svelte/store';
import type { Notebook, Cell, AddCellOptions } from '$lib/types/cell';

// Define the store interface - export it properly
export interface NotebookStore {
	subscribe: Readable<Notebook>['subscribe'];
	set: (value: Notebook) => void;
	update: (fn: (notebook: Notebook) => Notebook) => void;
	cells: Readable<readonly Cell[]>;
	focusedCell: Readable<Cell | null>;
	version: Readable<number>;
	addCell: (options?: AddCellOptions) => void;
	removeCell: (id: string) => void;
	updateCell: (id: string, updates: Partial<Omit<Cell, 'id'>>) => void;
	setFocus: (id: string) => void;
	toggleClosed: (id: string) => void;
	updateTitle: (title: string) => void;
	notebook: Notebook;
}

// Create a reactive notebook store
export function createNotebookStore(notebook: Notebook): NotebookStore {
	const { subscribe, set, update } = writable(notebook);

	// Keep a reference to the current notebook value for SSR compatibility
	let currentNotebook = notebook;

	// Create derived stores for reactive properties
	const cells = derived({ subscribe }, ($notebook) => $notebook.cells);
	const focusedCell = derived({ subscribe }, ($notebook) => $notebook.focusedCell);
	const version = derived({ subscribe }, ($notebook) => $notebook.version || 0);

	// Wrapper methods that trigger reactivity
	function addCell(options: AddCellOptions = {}) {
		update(($notebook) => {
			$notebook.addCell(options);
			currentNotebook = $notebook;
			return $notebook;
		});
	}

	function removeCell(id: string) {
		update(($notebook) => {
			$notebook.removeCell(id);
			currentNotebook = $notebook;
			return $notebook;
		});
	}

	function updateCell(id: string, updates: Partial<Omit<Cell, 'id'>>) {
		update(($notebook) => {
			$notebook.updateCell(id, updates);
			currentNotebook = $notebook;
			return $notebook;
		});
	}

	function setFocus(id: string) {
		update(($notebook) => {
			$notebook.setFocus(id);
			currentNotebook = $notebook;
			return $notebook;
		});
	}

	function toggleClosed(id: string) {
		update(($notebook) => {
			$notebook.toggleClosed(id);
			currentNotebook = $notebook;
			return $notebook;
		});
	}

	function updateTitle(title: string) {
		update(($notebook) => {
			$notebook.updateTitle(title);
			currentNotebook = $notebook;
			return $notebook;
		});
	}

	const store: NotebookStore = {
		subscribe,
		set,
		update,
		cells,
		focusedCell,
		version,
		addCell,
		removeCell,
		updateCell,
		setFocus,
		toggleClosed,
		updateTitle,
		// Expose the current notebook value (SSR compatible)
		get notebook() {
			return currentNotebook;
		}
	};

	return store;
}
