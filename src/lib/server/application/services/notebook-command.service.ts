import type { EventStore } from '../ports/outbound/event-store';
import type { EventBus } from '../ports/outbound/event-bus';
import type { NotebookProjectionManager } from './notebook-projection-manager';
import { AddCellCommandHandler } from '../command-handlers/add-cell-command-handler';
import { UpdateCellCommandHandler } from '../command-handlers/update-cell-command-handler';
import { DeleteCellCommandHandler } from '../command-handlers/delete-cell-command-handler';
import { MoveCellCommandHandler } from '../command-handlers/move-cell-command-handler';
import type { CellKind } from '$lib/server/domain/value-objects';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

/**
 * Application service that centralizes notebook command execution.
 * Handles command handler instantiation and dependency injection.
 * Routes should use this service instead of creating handlers directly.
 */
export class NotebookCommandService {
	private addCellHandler: AddCellCommandHandler;
	private updateCellHandler: UpdateCellCommandHandler;
	private deleteCellHandler: DeleteCellCommandHandler;
	private moveCellHandler: MoveCellCommandHandler;

	constructor(
		eventStore: EventStore,
		projectionManager: NotebookProjectionManager,
		eventBus: EventBus
	) {
		// Initialize all command handlers with their dependencies
		this.addCellHandler = new AddCellCommandHandler(eventStore, projectionManager, eventBus);
		this.updateCellHandler = new UpdateCellCommandHandler(eventStore, projectionManager, eventBus);
		this.deleteCellHandler = new DeleteCellCommandHandler(eventStore, projectionManager, eventBus);
		this.moveCellHandler = new MoveCellCommandHandler(eventStore, projectionManager, eventBus);

		logger.info('NotebookCommandService: Initialized with all command handlers');
	}

	/**
	 * Add a new cell to a notebook
	 */
	async addCell(
		notebookId: string,
		kind: CellKind,
		value: string,
		position: number
	): Promise<{ cellId: string; eventId: string }> {
		logger.info(
			`NotebookCommandService: Adding ${kind} cell to notebook ${notebookId} at position ${position}`
		);

		const result = await this.addCellHandler.handle({
			notebookId,
			kind,
			value,
			position
		});

		logger.info(`NotebookCommandService: Cell added successfully: ${result.cellId}`);
		return result;
	}

	/**
	 * Update an existing cell
	 */
	async updateCell(
		notebookId: string,
		cellId: string,
		updates: Partial<{ kind: CellKind; value: string }>
	): Promise<{ eventId: string }> {
		logger.info(`NotebookCommandService: Updating cell ${cellId} in notebook ${notebookId}`);

		const result = await this.updateCellHandler.handle({
			notebookId,
			cellId,
			updates
		});

		logger.info(`NotebookCommandService: Cell updated successfully`);
		return result;
	}

	/**
	 * Delete a cell from a notebook
	 */
	async deleteCell(notebookId: string, cellId: string): Promise<{ eventId: string }> {
		logger.info(`NotebookCommandService: Deleting cell ${cellId} from notebook ${notebookId}`);

		const result = await this.deleteCellHandler.handle({
			notebookId,
			cellId
		});

		logger.info(`NotebookCommandService: Cell deleted successfully`);
		return result;
	}

	/**
	 * Move a cell to a new position
	 */
	async moveCell(
		notebookId: string,
		cellId: string,
		position: number
	): Promise<{ eventId: string }> {
		logger.info(
			`NotebookCommandService: Moving cell ${cellId} to position ${position} in notebook ${notebookId}`
		);

		const result = await this.moveCellHandler.handle({
			notebookId,
			cellId,
			position
		});

		logger.info(`NotebookCommandService: Cell moved successfully`);
		return result;
	}
}
