import type { LibraryEvent } from '../../../ports/events/notebook.events';

export type Notebook = {
	id: string;
	title: string;
	description?: string;
	createdAt: Date;
	updatedAt: Date;
};

export interface LibraryService {
	createNotebook(title: string, description?: string): Promise<[string, string]>;
	getNotebook(notebookId: string): Notebook | null;
	getNotebookService(notebookId: string): Promise<NotebookService | undefined>;
	updateNotebook(
		notebookId: string,
		updates: Partial<{ title: string; description: string }>
	): Promise<string>;
	deleteNotebook(notebookId: string): Promise<string>;

	eventHandler(event: LibraryEvent): void;
	hydrateLibrary(): Promise<void>;
	registerLibraryCallback(): Promise<void>;
}

export type Cell = {
	id: string;
	kind: 'js' | 'md' | 'html';
	value: string;
	createdAt: Date;
	updatedAt: Date;
};

export interface NotebookService {
	get cells(): Cell[];

	addCell(kind: 'js' | 'md' | 'html', value: string, position: number): Promise<void>;
	deleteCell(cellId: string): Promise<void>;
	updateCell(
		cellId: string,
		updates: Partial<{ kind: 'js' | 'md' | 'html'; value: string }>
	): Promise<void>;
	moveCell(cellId: string, position: number): Promise<void>;
}
