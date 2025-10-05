import type { NotebookReadModel } from '../../ports/inbound/read-models';
import type { Cell, Notebook } from '$lib/server/domain/value-objects';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

export class InMemoryNotebookReadModel implements NotebookReadModel {
	private notebooks: Map<string, Notebook> = new Map();
	private cells: Map<string, Cell[]> = new Map();

	async getNotebook(notebookId: string): Promise<Notebook | null> {
		const notebook = this.notebooks.get(notebookId);
		logger.debug(
			`NotebookReadModel: getNotebook(${notebookId}): ${notebook ? 'found' : 'not found'}`
		);
		return notebook || null;
	}

	async getCells(notebookId: string): Promise<Cell[]> {
		const notebookCells = this.cells.get(notebookId) || [];
		logger.debug(`NotebookReadModel: getCells(${notebookId}): ${notebookCells.length} cells`);
		return [...notebookCells]; // Return a copy to prevent external mutation
	}

	async getCell(notebookId: string, cellId: string): Promise<Cell | null> {
		const notebookCells = this.cells.get(notebookId) || [];
		const cell = notebookCells.find((c) => c.id === cellId);
		logger.debug(
			`NotebookReadModel: getCell(${notebookId}, ${cellId}): ${cell ? 'found' : 'not found'}`
		);
		return cell || null;
	}

	async getNotebookCount(): Promise<number> {
		const count = this.notebooks.size;
		logger.debug(`NotebookReadModel: getNotebookCount(): ${count}`);
		return count;
	}

	// Internal methods for projectors to update the read model
	updateNotebook(notebook: Notebook): void {
		this.notebooks.set(notebook.id, notebook);
		logger.debug(`NotebookReadModel: updateNotebook(${notebook.id})`);
	}

	removeNotebook(notebookId: string): void {
		this.notebooks.delete(notebookId);
		this.cells.delete(notebookId);
		logger.debug(`NotebookReadModel: removeNotebook(${notebookId})`);
	}

	updateCells(notebookId: string, cells: Cell[]): void {
		this.cells.set(notebookId, [...cells]); // Store a copy
		logger.debug(`NotebookReadModel: updateCells(${notebookId}): ${cells.length} cells`);
	}

	addCell(notebookId: string, cell: Cell): void {
		const existingCells = this.cells.get(notebookId) || [];
		const updatedCells = [...existingCells, cell];
		this.cells.set(notebookId, updatedCells);
		logger.debug(`NotebookReadModel: addCell(${notebookId}, ${cell.id})`);
	}

	addCellAtPosition(notebookId: string, cell: Cell, position: number): void {
		const existingCells = this.cells.get(notebookId) || [];
		const updatedCells = [...existingCells];

		// Insert cell at the specified position
		updatedCells.splice(position, 0, cell);

		this.cells.set(notebookId, updatedCells);
		logger.debug(
			`NotebookReadModel: addCellAtPosition(${notebookId}, ${cell.id}) at position ${position}`
		);
	}

	updateCell(notebookId: string, cellId: string, updatedCell: Cell): void {
		const existingCells = this.cells.get(notebookId) || [];
		const cellIndex = existingCells.findIndex((c) => c.id === cellId);
		if (cellIndex >= 0) {
			const updatedCells = [...existingCells];
			updatedCells[cellIndex] = updatedCell;
			this.cells.set(notebookId, updatedCells);
			logger.debug(`NotebookReadModel: updateCell(${notebookId}, ${cellId})`);
		}
	}

	removeCell(notebookId: string, cellId: string): void {
		const existingCells = this.cells.get(notebookId) || [];
		const updatedCells = existingCells.filter((c) => c.id !== cellId);
		this.cells.set(notebookId, updatedCells);
		logger.debug(`NotebookReadModel: removeCell(${notebookId}, ${cellId})`);
	}

	moveCell(notebookId: string, cellId: string, newPosition: number): void {
		const existingCells = this.cells.get(notebookId) || [];
		const cellIndex = existingCells.findIndex((c) => c.id === cellId);
		if (cellIndex >= 0) {
			const cell = existingCells[cellIndex];
			const updatedCells = [...existingCells];
			updatedCells.splice(cellIndex, 1);
			updatedCells.splice(newPosition, 0, cell);
			this.cells.set(notebookId, updatedCells);
			logger.debug(`NotebookReadModel: moveCell(${notebookId}, ${cellId}, ${newPosition})`);
		}
	}
}
