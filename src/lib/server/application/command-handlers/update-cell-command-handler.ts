import { NotebookEventFactory } from '../services/notebook-event-factory';
import type { UpdateCellCommand, UpdateCellCommandResult } from '../commands/update-cell-command';
import { BaseCommandHandler } from './base-command-handler';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

export class UpdateCellCommandHandler extends BaseCommandHandler<
	UpdateCellCommand,
	UpdateCellCommandResult
> {
	async handle(command: UpdateCellCommand): Promise<UpdateCellCommandResult> {
		try {
			// Validate command
			this.validateCommand(command);

			// Execute with projection management
			return await this.executeWithProjection(
				command.notebookId,
				'UpdateCellCommandHandler',
				async (currentCells, eventId) => {
					// Create event using factory with validation
					const event = NotebookEventFactory.createUpdateCellEvent(
						command.notebookId,
						command.cellId,
						command.updates,
						currentCells
					);

					return {
						event,
						result: { eventId }
					};
				}
			);
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
