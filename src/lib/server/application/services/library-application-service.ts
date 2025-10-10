import type { EventStore } from '../ports/outbound/event-store';
import { LibraryServiceImpl } from '$lib/server/domain/domain-services/library.service.impl';
import type { Notebook } from '$lib/server/domain/value-objects';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

/**
 * Application service that bridges between pure domain services and infrastructure.
 * Handles event publishing and WebSocket broadcasting.
 */
export class LibraryApplicationService {
	private libraryService: LibraryServiceImpl;

	constructor(private eventStore: EventStore) {
		this.libraryService = new LibraryServiceImpl();
	}

	async initialize(): Promise<void> {
		// Hydrate the library service with existing events
		await this.hydrateLibrary();
	}

	async createNotebook(title: string, description?: string): Promise<[string, string]> {
		// Create domain event
		const event = this.libraryService.createNotebookEvent(title, description);

		// Publish event to event store
		const eventId = await this.eventStore.publishEvent('library', event.type, event.payload);

		// Process event to update domain state
		this.libraryService.eventHandler({ ...event, id: eventId });

		logger.info(
			`LibraryApplicationService: createNotebook: Created notebook ${event.payload.notebookId}`
		);

		return [event.payload.notebookId, eventId];
	}

	async updateNotebook(
		notebookId: string,
		updates: Partial<{ title: string; description: string }>
	): Promise<string> {
		// Create domain event
		const event = this.libraryService.createUpdateNotebookEvent(notebookId, updates);

		// Publish event to event store
		const eventId = await this.eventStore.publishEvent('library', event.type, event.payload);

		// Process event to update domain state
		this.libraryService.eventHandler({ ...event, id: eventId });

		logger.info(`LibraryApplicationService: updateNotebook: Updated notebook ${notebookId}`);

		return eventId;
	}

	async deleteNotebook(notebookId: string): Promise<string> {
		// Create domain event
		const event = this.libraryService.createDeleteNotebookEvent(notebookId);

		// Publish event to event store
		const eventId = await this.eventStore.publishEvent('library', event.type, event.payload);

		// Process event to update domain state
		this.libraryService.eventHandler({ ...event, id: eventId });

		logger.info(`LibraryApplicationService: deleteNotebook: Deleted notebook ${notebookId}`);

		return eventId;
	}

	getNotebook(notebookId: string): Notebook | null {
		return this.libraryService.getNotebook(notebookId);
	}

	private async hydrateLibrary(): Promise<void> {
		// Get all events for the library
		const events = await this.eventStore.getEvents('library');
		logger.info(`LibraryApplicationService: hydrateLibrary: ${events.length} events`);

		// Process each event
		events.forEach((event) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			this.libraryService.eventHandler(event as any);
		});
	}
}
