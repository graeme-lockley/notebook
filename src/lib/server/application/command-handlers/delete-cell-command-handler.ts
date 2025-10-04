import type { EventStore } from '../ports/outbound/event-store';
import type { StandaloneWebSocketBroadcaster } from '$lib/server/websocket/standalone-broadcaster';
import { NotebookApplicationService } from '../services/notebook-application-service';
import type { DeleteCellCommand, DeleteCellCommandResult } from '../commands/delete-cell-command';
import { logger } from '$lib/server/infrastructure/logging/logger.service';

export class DeleteCellCommandHandler {
	constructor(
		private eventStore: EventStore,
		private eventBroadcaster?: StandaloneWebSocketBroadcaster
	) {}

	async handle(command: DeleteCellCommand): Promise<DeleteCellCommandResult> {
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
			const event = notebookServiceInstance.createDeleteCellEvent(command.cellId);

			// Publish event to event store
			const eventId = await this.eventStore.publishEvent(
				command.notebookId,
				event.type,
				event.payload
			);

			// Process event to update domain state
			notebookServiceInstance.eventHandler({ ...event, id: eventId });

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
				`DeleteCellCommandHandler: Deleted cell ${command.cellId} from notebook ${command.notebookId}`
			);

			return {
				eventId
			};
		} catch (error) {
			logger.error('DeleteCellCommandHandler: Error deleting cell:', error);
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
