import type { EventStore } from '../ports/outbound/event-store';
import type { EventBus } from '../ports/outbound/event-bus';
import { NotebookApplicationService } from '../services/notebook-application-service';
import type { AddCellCommand, AddCellCommandResult } from '../commands/add-cell-command';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

export class AddCellCommandHandler {
	constructor(
		private eventStore: EventStore,
		private eventBus?: EventBus
	) {}

	async handle(command: AddCellCommand): Promise<AddCellCommandResult> {
		try {
			// Validate command
			this.validateCommand(command);

			// Create notebook application service
			const notebookService = new NotebookApplicationService(this.eventStore);

			// Get or create notebook service instance
			const notebookServiceInstance = await notebookService.getNotebookService(command.notebookId);

			// Create domain event
			const event = notebookServiceInstance.createCellEvent(
				command.kind,
				command.value,
				command.position
			);

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
				`AddCellCommandHandler: Added ${command.kind} cell to notebook ${command.notebookId}`
			);

			return {
				cellId: event.payload.cellId,
				eventId
			};
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
