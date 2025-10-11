import type { EventStore } from '../ports/outbound/event-store';
import type { EventBus } from '../ports/outbound/event-bus';
import { LibraryServiceImpl } from '$lib/server/domain/domain-services/library.service.impl';
import type { Notebook } from '$lib/server/domain/value-objects';
import { NotebookEventFactory } from './notebook-event-factory';
import {
	NOTEBOOK_EVENT_SCHEMAS,
	LIBRARY_EVENT_SCHEMAS
} from '$lib/server/adapters/outbound/event-store/remote/schemas';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

/**
 * Application service that bridges between pure domain services and infrastructure.
 * Handles event publishing and WebSocket broadcasting.
 */
export class LibraryApplicationService {
	private libraryService: LibraryServiceImpl;

	constructor(
		private eventStore: EventStore,
		private eventBus: EventBus
	) {
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

		// Create notebook topic and add welcome cell
		const notebookId = event.payload.notebookId;
		await this.createNotebookTopic(notebookId);

		logger.info(
			`LibraryApplicationService: createNotebook: Created notebook ${notebookId} with topic and welcome cell`
		);

		return [notebookId, eventId];
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

		// Publish to event bus for WebSocket broadcasting
		await this.eventBus.publish({
			...event,
			id: eventId,
			aggregateId: notebookId,
			timestamp: new Date()
		});

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
		try {
			// Ensure library topic exists with proper schemas
			await this.ensureLibraryTopicExists();

			// Get all events for the library
			const events = await this.eventStore.getEvents('library');
			logger.info(`LibraryApplicationService: hydrateLibrary: ${events.length} events`);

			// Process each event
			events.forEach((event) => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				this.libraryService.eventHandler(event as any);
			});
		} catch (error) {
			logger.error('LibraryApplicationService: Error during library hydration:', error);
			throw error;
		}
	}

	/**
	 * Ensures the library topic exists with proper schemas
	 */
	private async ensureLibraryTopicExists(): Promise<void> {
		try {
			// Try to get the topic to see if it exists
			await this.eventStore.getTopic('library');
			logger.info('LibraryApplicationService: Library topic already exists');
		} catch (error) {
			// If topic doesn't exist, create it
			if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
				logger.info('LibraryApplicationService: Library topic not found, creating it...');
				await this.eventStore.createTopic('library', LIBRARY_EVENT_SCHEMAS);
				logger.info('LibraryApplicationService: Library topic created successfully');
			} else {
				// Re-throw other errors
				throw error;
			}
		}
	}

	/**
	 * Creates a notebook topic and adds an initial welcome cell
	 */
	private async createNotebookTopic(notebookId: string): Promise<void> {
		try {
			// Create the notebook topic with proper schemas
			await this.eventStore.createTopic(notebookId, NOTEBOOK_EVENT_SCHEMAS);

			// Create welcome cell event
			const welcomeCellEvent = NotebookEventFactory.createWelcomeCellEvent(notebookId);

			// Publish welcome cell to notebook topic
			await this.eventStore.publishEvent(
				notebookId,
				welcomeCellEvent.type,
				welcomeCellEvent.payload
			);

			logger.info(
				`LibraryApplicationService: Created notebook topic ${notebookId} with welcome cell`
			);
		} catch (error) {
			logger.error(
				`LibraryApplicationService: Failed to create notebook topic ${notebookId}:`,
				error
			);
			throw error;
		}
	}
}
