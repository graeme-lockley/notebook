import type { NotebookStore } from '$lib/client/stores/notebook';
import type { CellKind } from '$lib/server/domain/value-objects/CellKind';
import * as ServerCommand from '$lib/client/server/server-commands';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

/**
 * NotebookCommandService - High-level command interface with business logic
 *
 * Responsibilities:
 * - Wrapping server command calls with business logic
 * - Position calculation for cell moves
 * - Command validation
 * - Coordinating between notebook store and server
 */
export class NotebookCommandService {
	constructor(
		private notebookId: string,
		private notebookStore: NotebookStore
	) {}

	/**
	 * Adds a new cell to the notebook
	 * @param kind - Type of cell (js, md, html)
	 * @param value - Cell content
	 * @param position - Position in the notebook
	 */
	async addCell(kind: CellKind, value: string, position: number): Promise<void> {
		logger.info(`📝 Adding ${kind} cell at position ${position}`);
		await ServerCommand.addCell(this.notebookId, kind, value, position);
	}

	/**
	 * Updates an existing cell
	 * @param cellId - ID of the cell to update
	 * @param updates - Partial updates to apply (kind and/or value)
	 */
	async updateCell(cellId: string, updates: { kind?: string; value?: string }): Promise<void> {
		logger.info(`✏️ Updating cell ${cellId}:`, updates);
		await ServerCommand.updateCell(this.notebookId, cellId, updates);
	}

	/**
	 * Deletes a cell from the notebook
	 * @param cellId - ID of the cell to delete
	 */
	async deleteCell(cellId: string): Promise<void> {
		logger.info(`🗑️ Deleting cell ${cellId}`);
		await ServerCommand.deleteCell(this.notebookId, cellId);
	}

	/**
	 * Moves a cell up or down in the notebook
	 * @param cellId - ID of the cell to move
	 * @param direction - Direction to move ('up' or 'down')
	 */
	async moveCell(cellId: string, direction: 'up' | 'down'): Promise<void> {
		const newPosition = this.calculateMovePosition(cellId, direction);

		if (newPosition === null) {
			logger.info(
				`Cell ${cellId} already at ${direction === 'up' ? 'top' : 'bottom'}, skipping move`
			);
			return;
		}

		logger.info(`↕️ Moving cell ${cellId} ${direction} to position ${newPosition}`);
		await ServerCommand.moveCell(this.notebookId, cellId, newPosition);
	}

	/**
	 * Duplicates a cell
	 * @param cellId - ID of the cell to duplicate
	 */
	async duplicateCell(cellId: string): Promise<void> {
		logger.info(`📋 Duplicating cell ${cellId}`);
		await ServerCommand.duplicateCell(this.notebookId, cellId);
	}

	/**
	 * Calculates the new position for a cell move operation
	 * @param cellId - ID of the cell to move
	 * @param direction - Direction to move
	 * @returns New position or null if move not possible
	 * @private
	 */
	private calculateMovePosition(cellId: string, direction: 'up' | 'down'): number | null {
		const currentPosition = this.notebookStore.findCellIndex(cellId);

		if (currentPosition === -1) {
			logger.error('Cell not found in notebook:', cellId);
			return null;
		}

		let newPosition: number;
		if (direction === 'up') {
			newPosition = Math.max(0, currentPosition - 1);
		} else {
			newPosition = Math.min(this.notebookStore.length() - 1, currentPosition + 1);
		}

		// If position hasn't changed, cell is at boundary
		if (newPosition === currentPosition) {
			return null;
		}

		return newPosition;
	}
}
