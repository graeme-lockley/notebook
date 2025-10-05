import type { EventStore } from '../ports/outbound/event-store';
import type { EventBus } from '../ports/outbound/event-bus';
import { NotebookApplicationService } from '../services/notebook-application-service';
import type { MoveCellCommand, MoveCellCommandResult } from '../commands/move-cell-command';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

export class MoveCellCommandHandler {
	constructor(
		private eventStore: EventStore,
		private eventBus?: EventBus
	) {}

	async handle(command: MoveCellCommand): Promise<MoveCellCommandResult> {
		try {
			// Validate command
			this.validateCommand(command);

			// Create notebook application service
			const notebookService = new NotebookApplicationService(this.eventStore);

			// Get or create notebook service instance
			const notebookServiceInstance = await notebookService.getNotebookService(command.notebookId);

			// Create domain event
			const event = notebookServiceInstance.createMoveCellEvent(command.cellId, command.position);

			// Publish event to event store
			const eventId = await this.eventStore.publishEvent(
				command.notebookId,
				event.type,
				event.payload
			);

			// Process event to update domain state
			notebookServiceInstance.eventHandler({ ...event, id: eventId });

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
				`MoveCellCommandHandler: Moved cell ${command.cellId} to position ${command.position} in notebook ${command.notebookId}`
			);

			return {
				eventId
			};
		} catch (error) {
			logger.info('MoveCellCommandHandler: Error moving cell:', error);
			throw error;
		}
	}

	private validateCommand(command: MoveCellCommand): void {
		if (!command.notebookId) {
			throw new Error('Notebook ID is required');
		}
		if (!command.cellId) {
			throw new Error('Cell ID is required');
		}
		if (command.position < 0) {
			throw new Error('Position must be non-negative');
		}
	}
}
