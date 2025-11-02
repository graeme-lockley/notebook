import type {
	LibraryEvent,
	NotebookCreatedEvent,
	NotebookDeletedEvent,
	NotebookUpdatedEvent
} from '../events/notebook.events';
import type { Notebook } from '../value-objects';

/**
 * Pure domain service for library operations.
 * Contains only business logic and returns domain events.
 * No infrastructure dependencies.
 */
export interface LibraryDomainService {
	// Event creation methods - return domain events instead of publishing them
	createNotebookEvent(
		title: string,
		description?: string,
		visibility?: 'private' | 'public' | 'protected',
		ownerId?: string | null
	): NotebookCreatedEvent;
	createUpdateNotebookEvent(
		notebookId: string,
		updates: Partial<{
			title: string;
			description: string;
			visibility: 'private' | 'public' | 'protected';
		}>
	): NotebookUpdatedEvent;
	createDeleteNotebookEvent(notebookId: string): NotebookDeletedEvent;

	// State management
	getNotebook(notebookId: string): Notebook | null;

	// Event handling - processes events to update internal state
	eventHandler(event: LibraryEvent & { id: string }): void;
}
