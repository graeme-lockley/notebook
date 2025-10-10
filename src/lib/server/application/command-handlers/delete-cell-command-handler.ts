import type { EventStore } from '../ports/outbound/event-store';
import type { EventBus } from '../ports/outbound/event-bus';
import type { NotebookProjectionManager } from '../services/notebook-projection-manager';
import { NotebookEventFactory } from '../services/notebook-event-factory';
import type { DeleteCellCommand, DeleteCellCommandResult } from '../commands/delete-cell-command';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

export class DeleteCellCommandHandler {
	constructor(
		private eventStore: EventStore,
		private projectionManager: NotebookProjectionManager,
		private eventBus?: EventBus
	) {}

	async handle(command: DeleteCellCommand): Promise<DeleteCellCommandResult> {
		try {
			// Validate command
			this.validateCommand(command);

			// Acquire projection for validation
			await this.projectionManager.acquireProjection(command.notebookId);

			try {
				// Get current cells from projection for validation
				const readModel = await this.projectionManager.getProjectionReadModel(command.notebookId);
				const currentCells = await readModel!.getCells(command.notebookId);

				// Create event using factory with validation
				const event = NotebookEventFactory.createDeleteCellEvent(
					command.notebookId,
					command.cellId,
					currentCells
				);

				// Publish event to event store
				const eventId = await this.eventStore.publishEvent(
					command.notebookId,
					event.type,
					event.payload
				);

				// Publish to event bus for projectors
				if (this.eventBus) {
					await this.eventBus.publish({
						id: eventId,
						type: event.type,
						payload: event.payload,
						timestamp: new Date(),
						aggregateId: command.notebookId
					});
				}

				logger.info(
					`DeleteCellCommandHandler: Deleted cell ${command.cellId} from notebook ${command.notebookId}`
				);

				return {
					eventId
				};
			} finally {
				// Always release projection
				await this.projectionManager.releaseProjection(command.notebookId);
			}
		} catch (error) {
			logger.info('DeleteCellCommandHandler: Error deleting cell:', error);
			throw error;
		}
	}

	private validateCommand(command: DeleteCellCommand): void {
		if (!command.notebookId) {
			throw new Error('Notebook ID is required');
		}
		if (!command.cellId) {
			throw new Error('Cell ID is required');
		}
	}
}
