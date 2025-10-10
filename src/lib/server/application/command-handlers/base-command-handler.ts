import type { EventStore } from '../ports/outbound/event-store';
import type { EventBus } from '../ports/outbound/event-bus';
import type { NotebookProjectionManager } from '../services/notebook-projection-manager';
import type { Cell } from '$lib/server/domain/value-objects';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

/**
 * Base class for command handlers that work with notebook projections.
 * Encapsulates the common pattern of:
 * 1. Acquiring projection
 * 2. Getting current state
 * 3. Creating event
 * 4. Publishing to event store
 * 5. Publishing to event bus
 * 6. Releasing projection
 * 7. Error handling
 *
 * Reduces ~70 lines of boilerplate per command handler.
 */
export abstract class BaseCommandHandler<TCommand, TResult> {
	constructor(
		protected eventStore: EventStore,
		protected projectionManager: NotebookProjectionManager,
		protected eventBus?: EventBus
	) {}

	/**
	 * Execute a command with projection management.
	 * Handles acquire/release lifecycle and event publishing.
	 *
	 * @param notebookId - The notebook ID
	 * @param commandName - Name of the command for logging
	 * @param operation - Function that creates event and partial result
	 * @returns Result with eventId injected
	 */
	protected async executeWithProjection(
		notebookId: string,
		commandName: string,
		operation: (
			currentCells: Cell[],
			eventId: string
		) => Promise<{
			event: { type: string; payload: unknown };
			result: TResult;
		}>
	): Promise<TResult> {
		await this.projectionManager.acquireProjection(notebookId);

		try {
			// Get current cells from projection
			const readModel = await this.projectionManager.getProjectionReadModel(notebookId);
			if (!readModel) {
				throw new Error(`Failed to get read model for notebook ${notebookId}`);
			}
			const currentCells = await readModel.getCells(notebookId);

			// Generate eventId placeholder that will be replaced
			const tempEventId = 'temp-event-id';

			// Execute operation to create event and result
			const { event, result } = await operation(currentCells, tempEventId);

			// Publish event to event store to get real eventId
			const eventId = await this.eventStore.publishEvent(notebookId, event.type, event.payload);

			// Publish to event bus for projectors
			if (this.eventBus) {
				await this.eventBus.publish({
					id: eventId,
					type: event.type,
					payload: event.payload,
					timestamp: new Date(),
					aggregateId: notebookId
				});
			}

			logger.info(`${commandName}: Success for notebook ${notebookId}`);

			// Inject real eventId into result if it has an eventId field
			if (typeof result === 'object' && result !== null && 'eventId' in result) {
				return { ...result, eventId } as TResult;
			}

			return result;
		} finally {
			// Always release projection
			await this.projectionManager.releaseProjection(notebookId);
		}
	}

	/**
	 * Validate command and delegate to implementation.
	 */
	abstract handle(command: TCommand): Promise<TResult>;
}
