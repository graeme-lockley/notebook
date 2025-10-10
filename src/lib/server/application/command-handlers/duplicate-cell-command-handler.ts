import { NotebookEventFactory } from '../services/notebook-event-factory';
import type {
	DuplicateCellCommand,
	DuplicateCellCommandResult
} from '../commands/duplicate-cell-command';
import { BaseCommandHandler } from './base-command-handler';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

export class DuplicateCellCommandHandler extends BaseCommandHandler<
	DuplicateCellCommand,
	DuplicateCellCommandResult
> {
	async handle(command: DuplicateCellCommand): Promise<DuplicateCellCommandResult> {
		logger.info(
			`DuplicateCellCommandHandler: Starting duplicate for notebook ${command.notebookId}, source cell ${command.cellId}`
		);

		try {
			// Validate command
			this.validateCommand(command);

			// Execute with projection management
			return await this.executeWithProjection(
				command.notebookId,
				'DuplicateCellCommandHandler',
				async (currentCells, eventId) => {
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

					return {
						event,
						result: {
							cellId: event.payload.cellId,
							eventId
						}
					};
				}
			);
		} catch (error) {
			logger.error('DuplicateCellCommandHandler: Error duplicating cell:', error);
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
