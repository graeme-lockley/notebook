import type { Cell, Notebook } from '$lib/server/domain/value-objects';

/**
 * Read-only interface for accessing cells
 */
export interface CellReadModel {
	getCells(notebookId: string): Promise<Cell[]>;
	getCell(notebookId: string, cellId: string): Promise<Cell | null>;
}

/**
 * Write interface for updating cells (used by projectors)
 */
export interface CellWriteModel {
	addCellAtPosition(notebookId: string, cell: Cell, position: number): void;
	updateCell(notebookId: string, cellId: string, updatedCell: Cell): void;
	removeCell(notebookId: string, cellId: string): void;
	moveCell(notebookId: string, cellId: string, newPosition: number): void;
}

/**
 * Combined interface for per-notebook read models.
 * Used by PerNotebookReadModel instances managed by NotebookProjectionManager.
 * Each instance handles cells for a single notebook with lazy loading.
 */
export interface PerNotebookReadModelInterface extends CellReadModel, CellWriteModel {}

/**
 * Global library read model interface for notebook metadata.
 * Always loaded at startup, provides notebook-level information without cell data.
 */
export interface LibraryReadModel {
	getNotebooks(): Promise<Notebook[]>;
	getNotebook(notebookId: string): Promise<Notebook | null>;
	getNotebookCount(): Promise<number>;
}
