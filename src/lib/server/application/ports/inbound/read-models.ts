import type { Cell, Notebook } from '$lib/server/domain/value-objects';

export interface NotebookReadModel {
	getNotebook(notebookId: string): Promise<Notebook | null>;
	getCells(notebookId: string): Promise<Cell[]>;
	getCell(notebookId: string, cellId: string): Promise<Cell | null>;
	getNotebookCount(): Promise<number>;
}

export interface LibraryReadModel {
	getNotebooks(): Promise<Notebook[]>;
	getNotebook(notebookId: string): Promise<Notebook | null>;
	getNotebookCount(): Promise<number>;
}
