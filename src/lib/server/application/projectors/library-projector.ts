import type { EventHandler, DomainEvent } from '../ports/outbound/event-bus';
import type { LibraryReadModel, NotebookReadModel } from '../ports/inbound/read-models';
import { logger } from '$lib/server/infrastructure/logging/logger.service';

export class LibraryProjector implements EventHandler {
	constructor(
		private readModel: LibraryReadModel,
		private notebookReadModel?: NotebookReadModel
	) {}

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
			createdAt: string;
		};

		// Create notebook object
		const notebook = {
			id: payload.notebookId,
			title: payload.title,
			description: payload.description,
			createdAt: new Date(payload.createdAt),
			updatedAt: new Date(payload.createdAt)
		};

		// Update library read model
		if (
			this.readModel instanceof
			(await import('../adapters/inbound/in-memory-library-read-model')).InMemoryLibraryReadModel
		) {
			this.readModel.updateNotebook(notebook);
		}

		// Also update notebook read model so it knows about the notebook
		if (this.notebookReadModel) {
			if (
				this.notebookReadModel instanceof
				(await import('../adapters/inbound/in-memory-notebook-read-model'))
					.InMemoryNotebookReadModel
			) {
				this.notebookReadModel.updateNotebook(notebook);
			}
		}

		logger.info(`LibraryProjector: Notebook created: ${payload.notebookId}`);
	}

	private async handleNotebookUpdated(event: DomainEvent): Promise<void> {
		const payload = event.payload as {
			notebookId: string;
			changes: { title?: string; description?: string };
			updatedAt: string;
		};

		// Get existing notebook
		const existingNotebook = await this.readModel.getNotebook(payload.notebookId);
		if (!existingNotebook) {
			logger.warn(`LibraryProjector: Notebook not found for update: ${payload.notebookId}`);
			return;
		}

		// Create updated notebook
		const updatedNotebook = {
			...existingNotebook,
			title: payload.changes.title || existingNotebook.title,
			description:
				payload.changes.description !== undefined
					? payload.changes.description
					: existingNotebook.description,
			updatedAt: new Date(payload.updatedAt)
		};

		// Update library read model
		if (
			this.readModel instanceof
			(await import('../adapters/inbound/in-memory-library-read-model')).InMemoryLibraryReadModel
		) {
			this.readModel.updateNotebook(updatedNotebook);
		}

		// Also update notebook read model
		if (this.notebookReadModel) {
			if (
				this.notebookReadModel instanceof
				(await import('../adapters/inbound/in-memory-notebook-read-model'))
					.InMemoryNotebookReadModel
			) {
				this.notebookReadModel.updateNotebook(updatedNotebook);
			}
		}

		logger.info(`LibraryProjector: Notebook updated: ${payload.notebookId}`);
	}

	private async handleNotebookDeleted(event: DomainEvent): Promise<void> {
		const payload = event.payload as {
			notebookId: string;
			deletedAt: string;
		};

		// Update library read model
		if (
			this.readModel instanceof
			(await import('../adapters/inbound/in-memory-library-read-model')).InMemoryLibraryReadModel
		) {
			this.readModel.removeNotebook(payload.notebookId);
		}

		// Also update notebook read model
		if (this.notebookReadModel) {
			if (
				this.notebookReadModel instanceof
				(await import('../adapters/inbound/in-memory-notebook-read-model'))
					.InMemoryNotebookReadModel
			) {
				this.notebookReadModel.removeNotebook(payload.notebookId);
			}
		}

		logger.info(`LibraryProjector: Notebook deleted: ${payload.notebookId}`);
	}
}
