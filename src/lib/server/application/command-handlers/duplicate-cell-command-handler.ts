import type { EventStore } from '../ports/outbound/event-store';
import type { EventBus } from '../ports/outbound/event-bus';
import type { NotebookProjectionManager } from '../services/notebook-projection-manager';
import { NotebookEventFactory } from '../services/notebook-event-factory';
import type {
	DuplicateCellCommand,
	DuplicateCellCommandResult
} from '../commands/duplicate-cell-command';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

export class DuplicateCellCommandHandler {
	constructor(
		private eventStore: EventStore,
		private projectionManager: NotebookProjectionManager,
		private eventBus?: EventBus
	) {}

	async handle(command: DuplicateCellCommand): Promise<DuplicateCellCommandResult> {
		logger.info(
			`DuplicateCellCommandHandler: Starting duplicate for notebook ${command.notebookId}, source cell ${command.cellId}`
		);

		try {
			// Validate command
			this.validateCommand(command);

			// Acquire projection for validation
			await this.projectionManager.acquireProjection(command.notebookId);

			try {
				// Get current cells from projection for validation
				const readModel = await this.projectionManager.getProjectionReadModel(command.notebookId);
				const currentCells = await readModel!.getCells(command.notebookId);

				// Find the source cell to duplicate
				const sourceCell = currentCells.find((cell) => cell.id === command.cellId);
				if (!sourceCell) {
					throw new Error(`Cell not found: ${command.cellId}`);
				}

				// Calculate position for duplicated cell (right after source cell)
				const sourceCellIndex = currentCells.indexOf(sourceCell);
				const newPosition = sourceCellIndex + 1;

				// Create event using factory with source cell's data
				const event = NotebookEventFactory.createCellEvent(
					command.notebookId,
					sourceCell.kind,
					sourceCell.value,
					newPosition,
					currentCells
				);

				logger.info(
					`DuplicateCellCommandHandler: Created event with new cellId: ${event.payload.cellId} for source cell ${command.cellId}`
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
					`DuplicateCellCommandHandler: Duplicated ${sourceCell.kind} cell ${command.cellId} in notebook ${command.notebookId}`
				);

				return {
					cellId: event.payload.cellId,
					eventId
				};
			} finally {
				// Always release projection
				await this.projectionManager.releaseProjection(command.notebookId);
			}
		} catch (error) {
			logger.info('DuplicateCellCommandHandler: Error duplicating cell:', error);
			throw error;
		}
	}

	private validateCommand(command: DuplicateCellCommand): void {
		if (!command.notebookId) {
			throw new Error('Notebook ID is required');
		}
		if (!command.cellId) {
			throw new Error('Cell ID is required');
		}
	}
}
