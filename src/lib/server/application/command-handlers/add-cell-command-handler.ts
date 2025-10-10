import { NotebookEventFactory } from '../services/notebook-event-factory';
import type { AddCellCommand, AddCellCommandResult } from '../commands/add-cell-command';
import { BaseCommandHandler } from './base-command-handler';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

export class AddCellCommandHandler extends BaseCommandHandler<
	AddCellCommand,
	AddCellCommandResult
> {
	async handle(command: AddCellCommand): Promise<AddCellCommandResult> {
		try {
			// Validate command
			this.validateCommand(command);

			// Execute with projection management
			return await this.executeWithProjection(
				command.notebookId,
				'AddCellCommandHandler',
				async (currentCells, eventId) => {
					// Create event using factory with validation
					const event = NotebookEventFactory.createCellEvent(
						command.notebookId,
						command.kind,
						command.value,
						command.position,
						currentCells
					);

					return {
						event,
						result: {
							cellId: event.payload.cellId,
							eventId // Will be injected by base handler
						}
					};
				}
			);
		} catch (error) {
			logger.error('AddCellCommandHandler: Error adding cell:', error);
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
