import { NotebookEventFactory } from '../services/notebook-event-factory';
import type { DeleteCellCommand, DeleteCellCommandResult } from '../commands/delete-cell-command';
import { BaseCommandHandler } from './base-command-handler';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

export class DeleteCellCommandHandler extends BaseCommandHandler<
	DeleteCellCommand,
	DeleteCellCommandResult
> {
	async handle(command: DeleteCellCommand): Promise<DeleteCellCommandResult> {
		try {
			// Validate command
			this.validateCommand(command);

			// Execute with projection management
			return await this.executeWithProjection(
				command.notebookId,
				'DeleteCellCommandHandler',
				async (currentCells, eventId) => {
					// Create event using factory with validation
					const event = NotebookEventFactory.createDeleteCellEvent(
						command.notebookId,
						command.cellId,
						currentCells
					);

					return {
						event,
						result: { eventId }
					};
				}
			);
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
