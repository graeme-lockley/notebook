import { NotebookEventFactory } from '../services/notebook-event-factory';
import type { MoveCellCommand, MoveCellCommandResult } from '../commands/move-cell-command';
import { BaseCommandHandler } from './base-command-handler';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

export class MoveCellCommandHandler extends BaseCommandHandler<
	MoveCellCommand,
	MoveCellCommandResult
> {
	async handle(command: MoveCellCommand): Promise<MoveCellCommandResult> {
		try {
			// Validate command
			this.validateCommand(command);

			// Execute with projection management
			return await this.executeWithProjection(
				command.notebookId,
				'MoveCellCommandHandler',
				async (currentCells, eventId) => {
					// Create event using factory with validation
					const event = NotebookEventFactory.createMoveCellEvent(
						command.notebookId,
						command.cellId,
						command.position,
						currentCells
					);

					return {
						event,
						result: { eventId }
					};
				}
			);
		} catch (error) {
			logger.error('MoveCellCommandHandler: Error moving cell:', error);
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
