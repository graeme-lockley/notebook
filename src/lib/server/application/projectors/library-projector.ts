import type { EventHandler, DomainEvent } from '../ports/outbound/event-bus';
import type { LibraryReadModel } from '../ports/inbound/read-models';
import { InMemoryLibraryReadModel } from '../adapters/inbound/in-memory-library-read-model';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

export class LibraryProjector implements EventHandler {
	constructor(private readModel: LibraryReadModel) {}

	async handle(event: DomainEvent): Promise<void> {
		logger.debug(`LibraryProjector: Handling event: ${event.type}`);

		switch (event.type) {
			case 'notebook.created':
				await this.handleNotebookCreated(event);
				break;
			case 'notebook.updated':
				await this.handleNotebookUpdated(event);
				break;
			case 'notebook.deleted':
				await this.handleNotebookDeleted(event);
				break;
			default:
				logger.debug(`LibraryProjector: Ignoring event type: ${event.type}`);
		}
	}

	private async handleNotebookCreated(event: DomainEvent): Promise<void> {
		const payload = event.payload as {
			notebookId: string;
			title: string;
			description?: string;
			visibility?: 'private' | 'public';
			ownerId?: string | null;
			createdAt: string;
		};

		// Create notebook object
		const notebook = {
			id: payload.notebookId,
			title: payload.title,
			description: payload.description,
			visibility: payload.visibility || 'public', // Default to public for legacy events
			ownerId: payload.ownerId || null, // Default to null for legacy events
			createdAt: new Date(payload.createdAt),
			updatedAt: new Date(payload.createdAt)
		};

		// Update library read model
		if (this.readModel instanceof InMemoryLibraryReadModel) {
			this.readModel.updateNotebook(notebook);
		}

		// Note: notebookReadModel is no longer used - each projection has its own read model
		// managed by NotebookProjectionManager

		logger.info(`LibraryProjector: Notebook created: ${payload.notebookId}`);
	}

	private async handleNotebookUpdated(event: DomainEvent): Promise<void> {
		const payload = event.payload as {
			notebookId: string;
			changes: { title?: string; description?: string; visibility?: 'private' | 'public' };
			updatedAt: string;
		};

		// Get existing notebook
		const existingNotebook = await this.readModel.getNotebook(payload.notebookId);
		if (!existingNotebook) {
			logger.warn(`LibraryProjector: Notebook not found for update: ${payload.notebookId}`);
			return;
		}

		// Create updated notebook (allow visibility changes, preserve ownerId)
		const updatedNotebook = {
			...existingNotebook,
			title: payload.changes.title || existingNotebook.title,
			description:
				payload.changes.description !== undefined
					? payload.changes.description
					: existingNotebook.description,
			visibility:
				payload.changes.visibility !== undefined
					? payload.changes.visibility
					: existingNotebook.visibility, // Allow visibility changes
			ownerId: existingNotebook.ownerId, // Preserve ownerId (cannot be changed)
			updatedAt: new Date(payload.updatedAt)
		};

		// Update library read model
		if (this.readModel instanceof InMemoryLibraryReadModel) {
			this.readModel.updateNotebook(updatedNotebook);
		}

		// Note: notebookReadModel is no longer used - each projection has its own read model
		// managed by NotebookProjectionManager

		logger.info(`LibraryProjector: Notebook updated: ${payload.notebookId}`);
	}

	private async handleNotebookDeleted(event: DomainEvent): Promise<void> {
		const payload = event.payload as {
			notebookId: string;
			deletedAt: string;
		};

		// Update library read model
		if (this.readModel instanceof InMemoryLibraryReadModel) {
			this.readModel.removeNotebook(payload.notebookId);
		}

		// Note: notebookReadModel is no longer used - each projection has its own read model
		// managed by NotebookProjectionManager

		logger.info(`LibraryProjector: Notebook deleted: ${payload.notebookId}`);
	}
}
