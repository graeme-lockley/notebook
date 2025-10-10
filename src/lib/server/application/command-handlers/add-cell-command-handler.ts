import type { EventStore } from '../ports/outbound/event-store';
import type { EventBus } from '../ports/outbound/event-bus';
import type { NotebookProjectionManager } from '../services/notebook-projection-manager';
import { NotebookEventFactory } from '../services/notebook-event-factory';
import type { AddCellCommand, AddCellCommandResult } from '../commands/add-cell-command';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

export class AddCellCommandHandler {
	constructor(
		private eventStore: EventStore,
		private projectionManager: NotebookProjectionManager,
		private eventBus?: EventBus
	) {}

	async handle(command: AddCellCommand): Promise<AddCellCommandResult> {
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
				const event = NotebookEventFactory.createCellEvent(
					command.notebookId,
					command.kind,
					command.value,
					command.position,
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
					`AddCellCommandHandler: Added ${command.kind} cell to notebook ${command.notebookId}`
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
			logger.info('AddCellCommandHandler: Error adding cell:', error);
			throw error;
		}
	}

	private validateCommand(command: AddCellCommand): void {
		if (!command.notebookId) {
			throw new Error('Notebook ID is required');
		}
		if (!command.kind) {
			throw new Error('Cell kind is required');
		}
		if (command.value === undefined || command.value === null) {
			throw new Error('Cell value is required');
		}
		if (command.position < 0) {
			throw new Error('Position must be non-negative');
		}
	}
}
