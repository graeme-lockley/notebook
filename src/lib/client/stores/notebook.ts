import { writable, derived, type Readable } from 'svelte/store';
import type { ReactiveNotebook, ReactiveCell, AddCellOptions } from '$lib/client/model/cell';

// Define the store interface - export it properly
export interface NotebookStore {
	subscribe: Readable<ReactiveNotebook>['subscribe'];
	set: (value: ReactiveNotebook) => void;
	update: (fn: (notebook: ReactiveNotebook) => ReactiveNotebook) => void;
	cells: Readable<readonly ReactiveCell[]>;
	focusedCell: Readable<ReactiveCell | null>;
	version: Readable<number>;
	addCell: (options: AddCellOptions) => Promise<ReactiveCell>;
	removeCell: (id: string) => Promise<void>;
	moveCell: (id: string, position: number) => Promise<void>;
	updateCell: (id: string, updates: Partial<Omit<ReactiveCell, 'id'>>) => Promise<void>;
	setFocus: (id: string) => void;
	toggleClosed: (id: string) => void;
	updateMetadata: (updates: { title?: string; description?: string }) => void;
	notebook: ReactiveNotebook;

	findCellIndex: (id: string) => number;
	length: () => number;
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
	async function addCell(options: AddCellOptions): Promise<ReactiveCell> {
		const newCell = await currentNotebook.addCell(options);
		set(currentNotebook);

		return newCell;
	}

	async function moveCell(id: string, position: number) {
		currentNotebook.moveCell(id, position);
		set(currentNotebook);
	}

	async function removeCell(id: string) {
		currentNotebook.removeCell(id);
		set(currentNotebook);
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

	function updateMetadata(updates: { title?: string; description?: string }) {
		currentNotebook.updateMetadata(updates);

		// Force Svelte reactivity by calling set (which notifies all subscribers)
		// This ensures the store value change is detected even though it's the same object reference
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
		moveCell,
		updateCell,
		setFocus,
		toggleClosed,
		updateMetadata,
		// Expose the current notebook value (SSR compatible)
		get notebook() {
			return currentNotebook;
		},

		findCellIndex(id: string): number {
			return this.notebook.cells.findIndex((cell) => cell.id === id);
		},
		length(): number {
			return this.notebook.cells.length;
		}
	};

	return store;
}
