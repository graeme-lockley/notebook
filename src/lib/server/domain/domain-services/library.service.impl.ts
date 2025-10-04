import type { EventStore } from '$lib/server/application/ports/outbound/event-store';
import { logger } from '$lib/server/infrastructure/logging/logger.service';
import type {
	LibraryEvent,
	NotebookCreatedEvent,
	NotebookDeletedEvent,
	NotebookUpdatedEvent
} from '$lib/server/domain/events/notebook.events';
import type { NotebookService } from '$lib/server/application/ports/inbound/notebook-service';
import type { LibraryService } from '$lib/server/application/ports/inbound/library-service';
import { Library } from './library';
import type { Notebook } from '$lib/server/domain/value-objects';
import type { StandaloneWebSocketBroadcaster } from '$lib/server/websocket/standalone-broadcaster';

export function createLibraryService(
	eventStore: EventStore,
	eventBroadcaster?: StandaloneWebSocketBroadcaster
): LibraryService {
	return new LibraryServiceImpl(eventStore, eventBroadcaster);
}

export class LibraryServiceImpl implements LibraryService {
	private lastEventId: string | null = null;
	private _eventStore: EventStore;
	private _eventBroadcaster?: StandaloneWebSocketBroadcaster;
	private library: Library = new Library();
	private notebookServices: Map<string, NotebookService> = new Map<string, NotebookService>();

	constructor(eventStore: EventStore, eventBroadcaster?: StandaloneWebSocketBroadcaster) {
		this._eventStore = eventStore;
		this._eventBroadcaster = eventBroadcaster;
	}

	async createNotebook(title: string, description?: string): Promise<[string, string]> {
		const notebookId = this.generateNotebookId();

		// Validate title
		if (!title || typeof title !== 'string' || title.trim() === '') {
			throw new Error('Title is required');
		}

		// Publish event
		const event: NotebookCreatedEvent = {
			type: 'notebook.created',
			payload: {
				notebookId,
				title,
				description,
				createdAt: new Date().toISOString()
			}
		};

		const eventId = await this.publishEvent(event);
		logger.info(`Created notebook: ${notebookId}`);

		return [notebookId, eventId];
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

	async getNotebookService(notebookId: string): Promise<NotebookService | undefined> {
		// Check if we already have a service for this notebook
		if (this.notebookServices.has(notebookId)) {
			return this.notebookServices.get(notebookId);
		}

		// Check if the notebook exists in our library
		const notebook = this.library.get(notebookId);
		if (!notebook) {
			logger.info(`LibraryService: getNotebookService: ${notebookId}: Not found`);
			return undefined;
		}

		// Create a new service for this notebook
		const { NotebookServiceImpl } = await import('./notebook.service.impl.js');
		const service = new NotebookServiceImpl(notebookId, this._eventStore, this._eventBroadcaster);

		// Initialize the service
		await service.initializeNotebook();
		await service.hydrateNotebook();
		await service.registerNotebookCallback();

		// Cache the service
		this.notebookServices.set(notebookId, service);

		logger.info(`LibraryService: getNotebookService: ${notebookId}: Created and cached`);
		return service;
	}

	async updateNotebook(
		notebookId: string,
		updates: Partial<{ title: string; description: string }>
	): Promise<string> {
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

		// Publish event
		const event: NotebookUpdatedEvent = {
			type: 'notebook.updated',
			payload: {
				notebookId: notebookId,
				changes: updates,
				updatedAt: new Date().toISOString()
			}
		};

		const eventId = await this.publishEvent(event);
		logger.info(`Updated notebook: ${notebookId}`);

		return eventId;
	}

	async deleteNotebook(notebookId: string): Promise<string> {
		this.getNotebookId(notebookId);

		// Publish event
		const event: NotebookDeletedEvent = {
			type: 'notebook.deleted',
			payload: {
				notebookId: notebookId,
				deletedAt: new Date().toISOString()
			}
		};

		const eventId = await this.publishEvent(event);
		logger.info(`Deleted notebook: ${notebookId}`);

		return eventId;
	}

	async publishEvent(event: LibraryEvent): Promise<string> {
		// Publish to the main notebooks topic
		const eventId = await this._eventStore.publishEvent('library', event.type, event.payload);
		logger.info(`Published event: ${event.type} with ID: ${eventId}`);

		// Update our last processed event ID
		this.lastEventId = eventId;

		return eventId;
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

	async hydrateLibrary(): Promise<void> {
		const events = await this._eventStore.getEvents('library');
		logger.info(`LibraryService: hydrateLibrary: ${events.length} events`);
		events.forEach((event) => {
			this.eventHandler(event as unknown as LibraryEvent & { id: string });
		});
	}

	async registerLibraryCallback(): Promise<void> {
		logger.info('LibraryService: registerLibraryCallback');

		const callbackUrl = 'http://localhost:5173/api/events/webhook';

		// Get existing consumers to avoid duplicates
		const existingConsumers = await this._eventStore.getConsumers();
		const hasExistingConsumer = existingConsumers.some(
			(consumer) => consumer.callback === callbackUrl
		);

		if (hasExistingConsumer) {
			logger.info('LibraryService: registerLibraryCallback: Consumer already exists');
			return;
		}

		// Register the new consumer
		await this._eventStore.registerConsumer(callbackUrl, { library: this.lastEventId });
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
