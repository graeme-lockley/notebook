import type { EventStore } from '../ports/outbound/event-store';
import { NotebookServiceImpl } from '$lib/server/domain/domain-services/notebook.service.impl';
import type { CellKind } from '$lib/server/domain/value-objects';
import { logger } from '$lib/server/infrastructure/logging/logger.service';

/**
 * Application service that bridges between pure domain services and infrastructure.
 * Handles event publishing and WebSocket broadcasting.
 */
export class NotebookApplicationService {
	private notebookServices: Map<string, NotebookServiceImpl> = new Map<
		string,
		NotebookServiceImpl
	>();

	constructor(private eventStore: EventStore) {}

	async getNotebookService(notebookId: string): Promise<NotebookServiceImpl> {
		// Check if we already have a service for this notebook
		if (this.notebookServices.has(notebookId)) {
			return this.notebookServices.get(notebookId)!;
		}

		// Create a new pure domain service for this notebook
		const service = new NotebookServiceImpl(notebookId);

		// Hydrate from events
		await this.hydrateNotebook(service);

		// Cache the service
		this.notebookServices.set(notebookId, service);

		logger.info(
			`NotebookApplicationService: getNotebookService: ${notebookId}: Created and cached`
		);
		return service;
	}

	async addCell(
		notebookId: string,
		kind: CellKind,
		value: string,
		position: number
	): Promise<void> {
		// Get or create domain service instance
		const notebookService = await this.getNotebookService(notebookId);

		// Create domain event
		const event = notebookService.createCellEvent(kind, value, position);

		// Publish event to event store
		const eventId = await this.eventStore.publishEvent(notebookId, event.type, event.payload);

		// Process event to update domain state
		notebookService.eventHandler({ ...event, id: eventId });

		logger.info(
			`NotebookApplicationService: addCell: Added ${kind} cell to notebook ${notebookId}`
		);
	}

	async updateCell(
		notebookId: string,
		cellId: string,
		updates: Partial<{ kind: CellKind; value: string }>
	): Promise<void> {
		// Get or create domain service instance
		const notebookService = await this.getNotebookService(notebookId);

		// Create domain event
		const event = notebookService.createUpdateCellEvent(cellId, updates);

		// Publish event to event store
		const eventId = await this.eventStore.publishEvent(notebookId, event.type, event.payload);

		// Process event to update domain state
		notebookService.eventHandler({ ...event, id: eventId });

		logger.info(
			`NotebookApplicationService: updateCell: Updated cell ${cellId} in notebook ${notebookId}`
		);
	}

	async deleteCell(notebookId: string, cellId: string): Promise<void> {
		// Get or create domain service instance
		const notebookService = await this.getNotebookService(notebookId);

		// Create domain event
		const event = notebookService.createDeleteCellEvent(cellId);

		// Publish event to event store
		const eventId = await this.eventStore.publishEvent(notebookId, event.type, event.payload);

		// Process event to update domain state
		notebookService.eventHandler({ ...event, id: eventId });

		logger.info(
			`NotebookApplicationService: deleteCell: Deleted cell ${cellId} from notebook ${notebookId}`
		);
	}

	async moveCell(notebookId: string, cellId: string, position: number): Promise<void> {
		// Get or create domain service instance
		const notebookService = await this.getNotebookService(notebookId);

		// Create domain event
		const event = notebookService.createMoveCellEvent(cellId, position);

		// Publish event to event store
		const eventId = await this.eventStore.publishEvent(notebookId, event.type, event.payload);

		// Process event to update domain state
		notebookService.eventHandler({ ...event, id: eventId });

		logger.info(
			`NotebookApplicationService: moveCell: Moved cell ${cellId} to position ${position} in notebook ${notebookId}`
		);
	}

	private async hydrateNotebook(notebookService: NotebookServiceImpl): Promise<void> {
		// Get all events for this notebook
		const events = await this.eventStore.getEvents(notebookService.id);
		logger.info(
			`NotebookApplicationService: hydrateNotebook: ${events.length} events for notebook ${notebookService.id}`
		);

		// Process each event
		events.forEach((event) => {
			// Create a properly typed event for the domain service
			const domainEvent = {
				id: event.id,
				type: event.type,
				payload: event.payload
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} as any; // TODO: Fix typing in Phase 3

			notebookService.eventHandler(domainEvent);
		});
	}
}
