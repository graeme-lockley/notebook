import type { EventStore } from '../ports/outbound/event-store';
import type { StandaloneWebSocketBroadcaster } from '$lib/server/websocket/standalone-broadcaster';
import type { EventBus } from '../ports/outbound/event-bus';
import { NotebookApplicationService } from '../services/notebook-application-service';
import type { UpdateCellCommand, UpdateCellCommandResult } from '../commands/update-cell-command';
import { logger } from '$lib/server/infrastructure/logging/logger.service';

export class UpdateCellCommandHandler {
	constructor(
		private eventStore: EventStore,
		private eventBroadcaster?: StandaloneWebSocketBroadcaster,
		private eventBus?: EventBus
	) {}

	async handle(command: UpdateCellCommand): Promise<UpdateCellCommandResult> {
		try {
			// Validate command
			this.validateCommand(command);

			// Create notebook application service
			const notebookService = new NotebookApplicationService(
				this.eventStore,
				this.eventBroadcaster
			);

			// Get or create notebook service instance
			const notebookServiceInstance = await notebookService.getNotebookService(command.notebookId);

			// Create domain event
			const event = notebookServiceInstance.createUpdateCellEvent(command.cellId, command.updates);

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

			// Broadcast via WebSocket
			if (this.eventBroadcaster) {
				await this.eventBroadcaster.broadcastCustomEvent(command.notebookId, 'notebook.updated', {
					cells: notebookServiceInstance.cells,
					event: {
						id: eventId,
						type: event.type,
						payload: event.payload
					}
				});
			}

			logger.info(
				`UpdateCellCommandHandler: Updated cell ${command.cellId} in notebook ${command.notebookId}`
			);

			return {
				eventId
			};
		} catch (error) {
			logger.error('UpdateCellCommandHandler: Error updating cell:', error);
			throw error;
		}
	}

	private validateCommand(command: UpdateCellCommand): void {
		if (!command.notebookId) {
			throw new Error('Notebook ID is required');
		}
		if (!command.cellId) {
			throw new Error('Cell ID is required');
		}
		if (!command.updates || Object.keys(command.updates).length === 0) {
			throw new Error('At least one update field is required');
		}
	}
}
