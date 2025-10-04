import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryNotebookReadModel } from './in-memory-notebook-read-model';
import type { Cell } from '$lib/server/domain/value-objects';

describe('InMemoryNotebookReadModel', () => {
	let readModel: InMemoryNotebookReadModel;
	const notebookId = 'test-notebook';
	const cell1: Cell = {
		id: 'cell-1',
		kind: 'js',
		value: 'console.log("first");',
		createdAt: new Date('2025-01-01T00:00:00Z'),
		updatedAt: new Date('2025-01-01T00:00:00Z')
	};
	const cell2: Cell = {
		id: 'cell-2',
		kind: 'md',
		value: '# Second cell',
		createdAt: new Date('2025-01-01T00:01:00Z'),
		updatedAt: new Date('2025-01-01T00:01:00Z')
	};
	const cell3: Cell = {
		id: 'cell-3',
		kind: 'html',
		value: '<div>Third cell</div>',
		createdAt: new Date('2025-01-01T00:02:00Z'),
		updatedAt: new Date('2025-01-01T00:02:00Z')
	};

	beforeEach(() => {
		readModel = new InMemoryNotebookReadModel();
	});

	describe('addCell', () => {
		it('should add cell to the end of the list', async () => {
			readModel.addCell(notebookId, cell1);
			readModel.addCell(notebookId, cell2);

			const cells = await readModel.getCells(notebookId);
			expect(cells).toHaveLength(2);
			expect(cells[0].id).toBe('cell-1');
			expect(cells[1].id).toBe('cell-2');
		});
	});

	describe('addCellAtPosition', () => {
		it('should insert cell at the beginning (position 0)', async () => {
			// Add initial cells
			readModel.addCell(notebookId, cell1);
			readModel.addCell(notebookId, cell2);

			// Insert cell3 at position 0 (beginning)
			readModel.addCellAtPosition(notebookId, cell3, 0);

			const cells = await readModel.getCells(notebookId);
			expect(cells).toHaveLength(3);
			expect(cells[0].id).toBe('cell-3'); // Should be first
			expect(cells[1].id).toBe('cell-1');
			expect(cells[2].id).toBe('cell-2');
		});

		it('should insert cell in the middle (position 1)', async () => {
			// Add initial cells
			readModel.addCell(notebookId, cell1);
			readModel.addCell(notebookId, cell2);

			// Insert cell3 at position 1 (middle)
			readModel.addCellAtPosition(notebookId, cell3, 1);

			const cells = await readModel.getCells(notebookId);
			expect(cells).toHaveLength(3);
			expect(cells[0].id).toBe('cell-1');
			expect(cells[1].id).toBe('cell-3'); // Should be in middle
			expect(cells[2].id).toBe('cell-2');
		});

		it('should insert cell at the end when position equals array length', async () => {
			// Add initial cells
			readModel.addCell(notebookId, cell1);
			readModel.addCell(notebookId, cell2);

			// Insert cell3 at position 2 (end)
			readModel.addCellAtPosition(notebookId, cell3, 2);

			const cells = await readModel.getCells(notebookId);
			expect(cells).toHaveLength(3);
			expect(cells[0].id).toBe('cell-1');
			expect(cells[1].id).toBe('cell-2');
			expect(cells[2].id).toBe('cell-3'); // Should be last
		});

		it('should handle inserting into empty notebook', async () => {
			// Insert into empty notebook
			readModel.addCellAtPosition(notebookId, cell1, 0);

			const cells = await readModel.getCells(notebookId);
			expect(cells).toHaveLength(1);
			expect(cells[0].id).toBe('cell-1');
		});

		it('should handle position beyond array length by inserting at end', async () => {
			// Add initial cell
			readModel.addCell(notebookId, cell1);

			// Try to insert at position 5 (beyond array length)
			readModel.addCellAtPosition(notebookId, cell2, 5);

			const cells = await readModel.getCells(notebookId);
			expect(cells).toHaveLength(2);
			expect(cells[0].id).toBe('cell-1');
			expect(cells[1].id).toBe('cell-2'); // Should be at end
		});

		it('should maintain correct order when adding multiple cells at different positions', async () => {
			// Add cells in non-sequential order
			readModel.addCellAtPosition(notebookId, cell1, 0); // First
			readModel.addCellAtPosition(notebookId, cell3, 1); // Second
			readModel.addCellAtPosition(notebookId, cell2, 1); // Insert in middle

			const cells = await readModel.getCells(notebookId);
			expect(cells).toHaveLength(3);
			expect(cells[0].id).toBe('cell-1');
			expect(cells[1].id).toBe('cell-2'); // Inserted in middle
			expect(cells[2].id).toBe('cell-3');
		});
	});

	describe('getCells', () => {
		it('should return cells in the order they were inserted', async () => {
			// Add cells at specific positions
			readModel.addCellAtPosition(notebookId, cell1, 0);
			readModel.addCellAtPosition(notebookId, cell3, 1);
			readModel.addCellAtPosition(notebookId, cell2, 1);

			const cells = await readModel.getCells(notebookId);
			expect(cells).toHaveLength(3);
			expect(cells.map((c) => c.id)).toEqual(['cell-1', 'cell-2', 'cell-3']);
		});

		it('should return empty array for non-existent notebook', async () => {
			const cells = await readModel.getCells('non-existent');
			expect(cells).toHaveLength(0);
		});
	});

	describe('updateCell', () => {
		it('should update cell content while preserving position', async () => {
			// Add cells
			readModel.addCellAtPosition(notebookId, cell1, 0);
			readModel.addCellAtPosition(notebookId, cell2, 1);

			// Update cell1
			const updatedCell1: Cell = {
				...cell1,
				value: 'console.log("updated");',
				updatedAt: new Date('2025-01-01T00:03:00Z')
			};
			readModel.updateCell(notebookId, 'cell-1', updatedCell1);

			const cells = await readModel.getCells(notebookId);
			expect(cells).toHaveLength(2);
			expect(cells[0].id).toBe('cell-1');
			expect(cells[0].value).toBe('console.log("updated");');
			expect(cells[1].id).toBe('cell-2'); // Position preserved
		});
	});

	describe('removeCell', () => {
		it('should remove cell while preserving order of remaining cells', async () => {
			// Add cells
			readModel.addCellAtPosition(notebookId, cell1, 0);
			readModel.addCellAtPosition(notebookId, cell2, 1);
			readModel.addCellAtPosition(notebookId, cell3, 2);

			// Remove middle cell
			readModel.removeCell(notebookId, 'cell-2');

			const cells = await readModel.getCells(notebookId);
			expect(cells).toHaveLength(2);
			expect(cells[0].id).toBe('cell-1');
			expect(cells[1].id).toBe('cell-3');
		});
	});
});
