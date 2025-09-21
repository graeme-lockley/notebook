import type { LibraryEvent, NotebookEvent } from '../../../domain/events/notebook.events';
import type { Notebook } from '../../../domain/value-objects/Notebook';
import type { Cell, CellKind } from '../../../domain/value-objects';
import type { EventStore } from '../outbound/event-store';

export type EventID = string;

export interface LibraryService {
	createNotebook(title: string, description?: string): Promise<[string, EventID]>;
	getNotebook(notebookId: string): Notebook | null;
	getNotebookService(notebookId: string): Promise<NotebookService | undefined>;
	updateNotebook(
		notebookId: string,
		updates: Partial<{ title: string; description: string }>
	): Promise<EventID>;
	deleteNotebook(notebookId: string): Promise<EventID>;

	eventHandler(event: LibraryEvent): void;
	hydrateLibrary(): Promise<void>;
	registerLibraryCallback(): Promise<void>;
}

export interface NotebookService {
	get cells(): Cell[];
	get eventStore(): EventStore;
	get lastEventId(): string | null;

	addCell(kind: CellKind, value: string, position: number): Promise<void>;
	deleteCell(cellId: string): Promise<void>;
	updateCell(cellId: string, updates: Partial<{ kind: CellKind; value: string }>): Promise<void>;
	moveCell(cellId: string, position: number): Promise<void>;
	eventHandler(event: NotebookEvent & { id: string }): void;
}
