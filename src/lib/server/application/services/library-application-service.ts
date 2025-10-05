import type { EventStore } from '../ports/outbound/event-store';
import { LibraryServiceImpl } from '$lib/server/domain/domain-services/library.service.impl';
import { NotebookServiceImpl } from '$lib/server/domain/domain-services/notebook.service.impl';
import type { Notebook } from '$lib/server/domain/value-objects';
import type {
	CellCreatedEvent,
	CellUpdatedEvent,
	CellDeletedEvent,
	CellMovedEvent
} from '$lib/server/domain/events/notebook.events';
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

	async getNotebookService(notebookId: string): Promise<NotebookServiceImpl | undefined> {
		// Check if notebook exists
		const notebook = this.getNotebook(notebookId);
		if (!notebook) {
			logger.info(`LibraryApplicationService: getNotebookService: ${notebookId}: Not found`);
			return undefined;
		}

		// Create notebook service instance
		const notebookService = new NotebookServiceImpl(notebookId);

		// Create the notebook topic if it doesn't exist
		try {
			await this.eventStore.getTopic(notebookId);
		} catch {
			// Topic doesn't exist, create it
			await this.eventStore.createTopic(notebookId, []);
		}

		// Initialize with welcome cell if needed
		// This would typically be handled by a command handler in Phase 2
		// For now, we'll create the welcome cell event
		const welcomeEvent = notebookService.createWelcomeCellEvent();
		const eventId = await this.eventStore.publishEvent(
			notebookId,
			welcomeEvent.type,
			welcomeEvent.payload
		);
		notebookService.eventHandler({ ...welcomeEvent, id: eventId });

		// Hydrate from events
		await this.hydrateNotebook(notebookService);

		logger.info(
			`LibraryApplicationService: getNotebookService: ${notebookId}: Created and initialized`
		);
		return notebookService;
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

	private async hydrateNotebook(notebookService: NotebookServiceImpl): Promise<void> {
		// Get all events for this notebook
		const events = await this.eventStore.getEvents(notebookService.id);
		logger.info(
			`LibraryApplicationService: hydrateNotebook: ${events.length} events for notebook ${notebookService.id}`
		);

		// Process each event
		events.forEach((event) => {
			// Create a properly typed event for the domain service
			const domainEvent = {
				id: event.id,
				type: event.type,
				payload: event.payload
			} as
				| (CellCreatedEvent & { id: string })
				| (CellUpdatedEvent & { id: string })
				| (CellDeletedEvent & { id: string })
				| (CellMovedEvent & { id: string });

			notebookService.eventHandler(domainEvent);
		});
	}
}
