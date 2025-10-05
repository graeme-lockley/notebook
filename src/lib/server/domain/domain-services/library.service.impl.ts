import { logger } from '$lib/common/infrastructure/logging/logger.service';
import type {
	LibraryEvent,
	NotebookCreatedEvent,
	NotebookDeletedEvent,
	NotebookUpdatedEvent
} from '$lib/server/domain/events/notebook.events';
import { Library } from './library';
import type { Notebook } from '$lib/server/domain/value-objects';
import type { LibraryDomainService } from './library.domain-service';

export function createLibraryService(): LibraryServiceImpl {
	return new LibraryServiceImpl();
}

export class LibraryServiceImpl implements LibraryDomainService {
	private lastEventId: string | null = null;
	private library: Library = new Library();

	constructor() {
		// Pure domain service with no infrastructure dependencies
	}

	createNotebookEvent(title: string, description?: string): NotebookCreatedEvent {
		const notebookId = this.generateNotebookId();

		// Validate title
		if (!title || typeof title !== 'string' || title.trim() === '') {
			throw new Error('Title is required');
		}

		// Create event
		const event: NotebookCreatedEvent = {
			type: 'notebook.created',
			payload: {
				notebookId,
				title,
				description,
				createdAt: new Date().toISOString()
			}
		};

		logger.info(`LibraryService: createNotebookEvent: Created notebook event for: ${notebookId}`);

		return event;
	}

	getNotebook(notebookId: string): Notebook | null {
		const notebook = this.library.get(notebookId);
		if (!notebook) {
			return null;
		}

		// Return a defensive copy to prevent external modifications
		return {
			id: notebook.id,
			title: notebook.title,
			description: notebook.description,
			createdAt: notebook.createdAt,
			updatedAt: notebook.updatedAt
		};
	}

	createUpdateNotebookEvent(
		notebookId: string,
		updates: Partial<{ title: string; description: string }>
	): NotebookUpdatedEvent {
		this.getNotebookId(notebookId);

		// Trim and validate title if provided
		if (updates.title !== undefined) {
			const trimmedTitle = updates.title.trim();
			if (trimmedTitle === '') {
				throw new Error('Title is required');
			}
			// Update the title with trimmed value
			updates.title = trimmedTitle;
		}

		// Create event
		const event: NotebookUpdatedEvent = {
			type: 'notebook.updated',
			payload: {
				notebookId: notebookId,
				changes: updates,
				updatedAt: new Date().toISOString()
			}
		};

		logger.info(
			`LibraryService: createUpdateNotebookEvent: Created update event for notebook: ${notebookId}`
		);

		return event;
	}

	createDeleteNotebookEvent(notebookId: string): NotebookDeletedEvent {
		this.getNotebookId(notebookId);

		// Create event
		const event: NotebookDeletedEvent = {
			type: 'notebook.deleted',
			payload: {
				notebookId: notebookId,
				deletedAt: new Date().toISOString()
			}
		};

		logger.info(
			`LibraryService: createDeleteNotebookEvent: Created delete event for notebook: ${notebookId}`
		);

		return event;
	}

	eventHandler(event: LibraryEvent & { id: string }): void {
		const { type } = event;
		logger.info(`LibraryService: eventHandler: ${type}: ${JSON.stringify(event.payload)}`);

		switch (type) {
			case 'notebook.created': {
				const { notebookId, title, description, createdAt } = event.payload;
				const notebook: Notebook = {
					id: notebookId,
					title,
					description: description,
					createdAt: new Date(createdAt),
					updatedAt: new Date(createdAt)
				};
				this.library.set(notebookId, notebook);
				break;
			}
			case 'notebook.updated': {
				const { notebookId, changes, updatedAt } = event.payload;
				const notebook = this.library.get(notebookId);
				if (notebook === undefined) {
					logger.warn(
						`LibraryService: eventHandler: notebook.updated: Notebook not found: ${notebookId}: ${JSON.stringify(event.payload)}`
					);
				} else {
					if (changes.title !== undefined) {
						notebook.title = changes.title;
					}
					if (changes.description !== undefined) {
						notebook.description = changes.description;
					}
					notebook.updatedAt = new Date(updatedAt);
				}
				break;
			}
			case 'notebook.deleted': {
				logger.info(
					`LibraryService: eventHandler: notebook.deleted: ${JSON.stringify(event.payload)}`
				);
				const { notebookId } = event.payload;
				if (this.library.has(notebookId)) {
					this.library.delete(notebookId);
				} else {
					logger.warn(
						`LibraryService: eventHandler: notebook.deleted: Notebook not found: ${notebookId}: ${JSON.stringify(event.payload)}`
					);
				}
				break;
			}
			default:
				logger.warn(`LibraryService: eventHandler: Unknown notebook event type: ${type}`);
		}

		// Update the last processed event ID
		this.lastEventId = event.id;
	}

	private getNotebookId(notebookId: string): Notebook {
		const nb = this.library.get(notebookId);

		if (!nb) {
			throw new Error(`Notebook not found: ${notebookId}`);
		}
		return nb;
	}

	private generateNotebookId(): string {
		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2, 15);
		return `notebook-${timestamp}-${random}`;
	}
}
