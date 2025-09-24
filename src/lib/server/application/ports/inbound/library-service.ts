import type { LibraryEvent } from '../../../domain/events/notebook.events';
import type { Notebook } from '../../../domain/value-objects/Notebook';
import type { NotebookService } from './notebook-service';
import type { EventID } from '../../../domain/value-objects/EventID';

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
