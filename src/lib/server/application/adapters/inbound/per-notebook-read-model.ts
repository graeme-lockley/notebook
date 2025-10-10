import type { PerNotebookReadModelInterface } from '../../ports/inbound/read-models';
import type { Cell } from '$lib/server/domain/value-objects';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

/**
 * Per-notebook read model that stores cells for a single notebook.
 * Notebook metadata is handled by LibraryReadModel.
 *
 * Implements focused interface with only cell operations (no notebook metadata).
 */
export class PerNotebookReadModel implements PerNotebookReadModelInterface {
	private cells: Cell[] = [];

	constructor(private notebookId: string) {
		logger.debug(`PerNotebookReadModel: Created for notebook ${notebookId}`);
	}

	async getCells(notebookId: string): Promise<Cell[]> {
		if (notebookId !== this.notebookId) {
			logger.warn(
				`PerNotebookReadModel: getCells called with wrong notebookId: ${notebookId}, expected: ${this.notebookId}`
			);
			return [];
		}
		logger.debug(`PerNotebookReadModel: getCells(${notebookId}): ${this.cells.length} cells`);
		return [...this.cells]; // Return a copy to prevent external mutation
	}

	async getCell(notebookId: string, cellId: string): Promise<Cell | null> {
		if (notebookId !== this.notebookId) {
			logger.warn(
				`PerNotebookReadModel: getCell called with wrong notebookId: ${notebookId}, expected: ${this.notebookId}`
			);
			return null;
		}
		const cell = this.cells.find((c) => c.id === cellId);
		logger.debug(
			`PerNotebookReadModel: getCell(${notebookId}, ${cellId}): ${cell ? 'found' : 'not found'}`
		);
		return cell || null;
	}

	addCellAtPosition(notebookId: string, cell: Cell, position: number): void {
		if (notebookId !== this.notebookId) {
			logger.warn(
				`PerNotebookReadModel: addCellAtPosition called with wrong notebookId: ${notebookId}, expected: ${this.notebookId}`
			);
			return;
		}
		const updatedCells = [...this.cells];

		// Insert cell at the specified position
		updatedCells.splice(position, 0, cell);

		this.cells = updatedCells;
		logger.debug(
			`PerNotebookReadModel: addCellAtPosition(${notebookId}, ${cell.id}) at position ${position}`
		);
	}

	updateCell(notebookId: string, cellId: string, updatedCell: Cell): void {
		if (notebookId !== this.notebookId) {
			logger.warn(
				`PerNotebookReadModel: updateCell called with wrong notebookId: ${notebookId}, expected: ${this.notebookId}`
			);
			return;
		}
		const cellIndex = this.cells.findIndex((c) => c.id === cellId);
		if (cellIndex >= 0) {
			const updatedCells = [...this.cells];
			updatedCells[cellIndex] = updatedCell;
			this.cells = updatedCells;
			logger.debug(`PerNotebookReadModel: updateCell(${notebookId}, ${cellId})`);
		}
	}

	removeCell(notebookId: string, cellId: string): void {
		if (notebookId !== this.notebookId) {
			logger.warn(
				`PerNotebookReadModel: removeCell called with wrong notebookId: ${notebookId}, expected: ${this.notebookId}`
			);
			return;
		}
		const updatedCells = this.cells.filter((c) => c.id !== cellId);
		this.cells = updatedCells;
		logger.debug(`PerNotebookReadModel: removeCell(${notebookId}, ${cellId})`);
	}

	moveCell(notebookId: string, cellId: string, newPosition: number): void {
		if (notebookId !== this.notebookId) {
			logger.warn(
				`PerNotebookReadModel: moveCell called with wrong notebookId: ${notebookId}, expected: ${this.notebookId}`
			);
			return;
		}
		const cellIndex = this.cells.findIndex((c) => c.id === cellId);
		if (cellIndex >= 0) {
			const cell = this.cells[cellIndex];
			const updatedCells = [...this.cells];
			updatedCells.splice(cellIndex, 1);
			updatedCells.splice(newPosition, 0, cell);
			this.cells = updatedCells;
			logger.debug(`PerNotebookReadModel: moveCell(${notebookId}, ${cellId}, ${newPosition})`);
		}
	}
}
