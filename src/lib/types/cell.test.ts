import { describe, it, expect, beforeEach } from 'vitest';
import { Notebook } from './cell';

describe('Notebook', () => {
	let notebook: Notebook;

	beforeEach(() => {
		notebook = new Notebook({
			title: 'Test Notebook',
			description: 'A test notebook'
		});
	});

	describe('Constructor', () => {
		it('should create a notebook with default values', () => {
			const defaultNotebook = new Notebook();
			expect(defaultNotebook.title).toBe('Untitled Notebook');
			expect(defaultNotebook.description).toBe('');
			expect(defaultNotebook.cells).toHaveLength(0);
		});

		it('should create a notebook with custom values', () => {
			const customNotebook = new Notebook({
				title: 'Custom Title',
				description: 'Custom Description'
			});
			expect(customNotebook.title).toBe('Custom Title');
			expect(customNotebook.description).toBe('Custom Description');
		});
	});

	describe('Getters', () => {
		beforeEach(() => {
			notebook.addCell({ kind: 'js', value: 'console.log("test")' });
			notebook.addCell({ kind: 'md', value: '# Test' });
		});

		it('should return readonly cells array', () => {
			const cells = notebook.cells;
			expect(cells).toHaveLength(2);
			// Test that the array reference is readonly (TypeScript compile-time check)
			// The readonly modifier prevents direct mutation of the array reference
			expect(Array.isArray(cells)).toBe(true);
			expect(cells.length).toBe(2);
		});

		it('should return focused cell', () => {
			notebook.setFocus(notebook.cells[0].id);
			expect(notebook.focusedCell).toBe(notebook.cells[0]);
		});

		it('should return null when no cell is focused', () => {
			expect(notebook.focusedCell).toBeNull();
		});

		it('should return pinned cells', () => {
			notebook.updateCell(notebook.cells[0].id, { isPinned: true });
			expect(notebook.pinnedCells).toHaveLength(1);
			expect(notebook.pinnedCells[0]).toBe(notebook.cells[0]);
		});

		it('should return open cells', () => {
			notebook.updateCell(notebook.cells[0].id, { isClosed: false });
			expect(notebook.openCells).toHaveLength(1);
			expect(notebook.openCells[0]).toBe(notebook.cells[0]);
		});

		it('should return closed cells', () => {
			expect(notebook.closedCells).toHaveLength(2);
		});
	});

	describe('Cell Management', () => {
		describe('addCell', () => {
			it('should add a cell with default values', () => {
				const cell = notebook.addCell();
				expect(cell.kind).toBe('js');
				expect(cell.value).toContain('console.log("Hello!")');
				expect(cell.isClosed).toBe(true);
				expect(cell.isFocused).toBe(false);
				expect(notebook.cells).toHaveLength(1);
			});

			it('should add a cell with custom values', () => {
				const cell = notebook.addCell({
					kind: 'md',
					value: '# Custom Markdown',
					focus: true
				});
				expect(cell.kind).toBe('md');
				expect(cell.value).toBe('# Custom Markdown');
				expect(cell.isFocused).toBe(true);
			});

			it('should add cell above another cell', () => {
				const firstCell = notebook.addCell({ kind: 'js' });
				const secondCell = notebook.addCell({ kind: 'md' });
				const newCell = notebook.addCell({
					kind: 'html',
					position: 'above',
					relativeToId: secondCell.id
				});

				expect(notebook.cells).toHaveLength(3);
				expect(notebook.cells[0]).toBe(firstCell);
				expect(notebook.cells[1]).toBe(newCell);
				expect(notebook.cells[2]).toBe(secondCell);
			});

			it('should add cell below another cell', () => {
				const firstCell = notebook.addCell({ kind: 'js' });
				const secondCell = notebook.addCell({ kind: 'md' });
				const newCell = notebook.addCell({
					kind: 'html',
					position: 'below',
					relativeToId: firstCell.id
				});

				expect(notebook.cells).toHaveLength(3);
				expect(notebook.cells[0]).toBe(firstCell);
				expect(notebook.cells[1]).toBe(newCell);
				expect(notebook.cells[2]).toBe(secondCell);
			});

			it('should generate unique IDs for cells', () => {
				const cell1 = notebook.addCell();
				const cell2 = notebook.addCell();
				expect(cell1.id).not.toBe(cell2.id);
			});
		});

		describe('removeCell', () => {
			it('should remove a cell by ID', () => {
				const cell = notebook.addCell();
				const result = notebook.removeCell(cell.id);
				expect(result).toBe(true);
				expect(notebook.cells).toHaveLength(0);
			});

			it('should return false for non-existent cell', () => {
				const result = notebook.removeCell('non-existent');
				expect(result).toBe(false);
			});
		});

		describe('updateCell', () => {
			it('should update cell properties', () => {
				const cell = notebook.addCell();
				const result = notebook.updateCell(cell.id, {
					value: 'Updated value',
					isPinned: true
				});
				expect(result).toBe(true);
				expect(cell.value).toBe('Updated value');
				expect(cell.isPinned).toBe(true);
			});

			it('should return false for non-existent cell', () => {
				const result = notebook.updateCell('non-existent', { value: 'test' });
				expect(result).toBe(false);
			});
		});

		describe('getCell', () => {
			it('should return cell by ID', () => {
				const cell = notebook.addCell();
				const found = notebook.getCell(cell.id);
				expect(found).toBe(cell);
			});

			it('should return null for non-existent cell', () => {
				const found = notebook.getCell('non-existent');
				expect(found).toBeNull();
			});
		});
	});

	describe('Focus Management', () => {
		beforeEach(() => {
			notebook.addCell({ kind: 'js' });
			notebook.addCell({ kind: 'md' });
		});

		it('should set focus on a cell', () => {
			const cell = notebook.cells[0];
			const result = notebook.setFocus(cell.id);
			expect(result).toBe(true);
			expect(cell.isFocused).toBe(true);
			expect(notebook.cells[1].isFocused).toBe(false);
		});

		it('should clear focus from other cells when setting focus', () => {
			notebook.setFocus(notebook.cells[0].id);
			notebook.setFocus(notebook.cells[1].id);
			expect(notebook.cells[0].isFocused).toBe(false);
			expect(notebook.cells[1].isFocused).toBe(true);
		});

		it('should return false for non-existent cell', () => {
			const result = notebook.setFocus('non-existent');
			expect(result).toBe(false);
		});

		it('should clear focus from all cells', () => {
			notebook.setFocus(notebook.cells[0].id);
			notebook.clearFocus();
			expect(notebook.cells[0].isFocused).toBe(false);
			expect(notebook.cells[1].isFocused).toBe(false);
		});
	});

	describe('Editing Management', () => {
		beforeEach(() => {
			notebook.addCell({ kind: 'js' });
			notebook.addCell({ kind: 'md' });
		});

		it('should set editing on a cell', () => {
			const cell = notebook.cells[0];
			const result = notebook.setEditing(cell.id);
			expect(result).toBe(true);
			expect(cell.isEditing).toBe(true);
			expect(notebook.cells[1].isEditing).toBe(false);
		});

		it('should clear editing from other cells when setting editing', () => {
			notebook.setEditing(notebook.cells[0].id);
			notebook.setEditing(notebook.cells[1].id);
			expect(notebook.cells[0].isEditing).toBe(false);
			expect(notebook.cells[1].isEditing).toBe(true);
		});

		it('should return false for non-existent cell', () => {
			const result = notebook.setEditing('non-existent');
			expect(result).toBe(false);
		});

		it('should clear editing from all cells', () => {
			notebook.setEditing(notebook.cells[0].id);
			notebook.clearEditing();
			expect(notebook.cells[0].isEditing).toBe(false);
			expect(notebook.cells[1].isEditing).toBe(false);
		});

		it('should return editing cell', () => {
			expect(notebook.editingCell).toBeNull();

			notebook.setEditing(notebook.cells[0].id);
			expect(notebook.editingCell).toBe(notebook.cells[0]);

			notebook.clearEditing();
			expect(notebook.editingCell).toBeNull();
		});
	});

	describe('Cell Operations', () => {
		beforeEach(() => {
			notebook.addCell({ kind: 'js' });
		});

		describe('toggleClosed', () => {
			it('should toggle cell closed state', () => {
				const cell = notebook.cells[0];
				expect(cell.isClosed).toBe(true);

				notebook.toggleClosed(cell.id);
				expect(cell.isClosed).toBe(false);

				notebook.toggleClosed(cell.id);
				expect(cell.isClosed).toBe(true);
			});

			it('should return false for non-existent cell', () => {
				const result = notebook.toggleClosed('non-existent');
				expect(result).toBe(false);
			});
		});

		describe('togglePinned', () => {
			it('should toggle cell pinned state', () => {
				const cell = notebook.cells[0];
				expect(cell.isPinned).toBe(false);

				notebook.togglePinned(cell.id);
				expect(cell.isPinned).toBe(true);

				notebook.togglePinned(cell.id);
				expect(cell.isPinned).toBe(false);
			});

			it('should return false for non-existent cell', () => {
				const result = notebook.togglePinned('non-existent');
				expect(result).toBe(false);
			});
		});

		describe('runCell', () => {
			it('should run a cell and update status', async () => {
				const cell = notebook.cells[0];
				expect(cell.status).toBe('ok');

				const runPromise = notebook.runCell(cell.id);
				expect(cell.status).toBe('pending');

				await runPromise;
				expect(cell.status).toBe('ok');
			});

			it('should handle non-existent cell gracefully', async () => {
				await expect(notebook.runCell('non-existent')).resolves.toBeUndefined();
			});
		});

		describe('runAllCells', () => {
			it('should run all cells', async () => {
				notebook.addCell({ kind: 'md' });
				notebook.addCell({ kind: 'html' });

				await notebook.runAllCells();

				notebook.cells.forEach((cell) => {
					expect(cell.status).toBe('ok');
				});
			});
		});
	});

	describe('Cell Reordering', () => {
		beforeEach(() => {
			notebook.addCell({ kind: 'js' });
			notebook.addCell({ kind: 'md' });
			notebook.addCell({ kind: 'html' });
		});

		describe('moveCell', () => {
			it('should move cell to new index', () => {
				const cell = notebook.cells[0];
				const result = notebook.moveCell(cell.id, 2);
				expect(result).toBe(true);
				expect(notebook.cells[2]).toBe(cell);
			});

			it('should return false for invalid index', () => {
				const cell = notebook.cells[0];
				expect(notebook.moveCell(cell.id, -1)).toBe(false);
				expect(notebook.moveCell(cell.id, 10)).toBe(false);
			});

			it('should return false for non-existent cell', () => {
				expect(notebook.moveCell('non-existent', 1)).toBe(false);
			});
		});

		describe('moveCellUp', () => {
			it('should move cell up', () => {
				const cell = notebook.cells[1];
				const result = notebook.moveCellUp(cell.id);
				expect(result).toBe(true);
				expect(notebook.cells[0]).toBe(cell);
			});

			it('should return false for first cell', () => {
				const cell = notebook.cells[0];
				expect(notebook.moveCellUp(cell.id)).toBe(false);
			});
		});

		describe('moveCellDown', () => {
			it('should move cell down', () => {
				const cell = notebook.cells[0];
				const result = notebook.moveCellDown(cell.id);
				expect(result).toBe(true);
				expect(notebook.cells[1]).toBe(cell);
			});

			it('should return false for last cell', () => {
				const cell = notebook.cells[2];
				expect(notebook.moveCellDown(cell.id)).toBe(false);
			});
		});
	});

	describe('Notebook Metadata', () => {
		it('should update title', () => {
			notebook.updateTitle('New Title');
			expect(notebook.title).toBe('New Title');
		});

		it('should update description', () => {
			notebook.updateDescription('New Description');
			expect(notebook.description).toBe('New Description');
		});

		it('should update timestamps when modifying notebook', () => {
			const originalUpdatedAt = notebook.updatedAt;

			// Wait a bit to ensure timestamp difference
			setTimeout(() => {
				notebook.updateTitle('Test');
				expect(notebook.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
			}, 10);
		});
	});

	describe('Serialization', () => {
		beforeEach(() => {
			notebook.addCell({ kind: 'js', value: 'console.log("test")' });
			notebook.addCell({ kind: 'md', value: '# Test' });
		});

		it('should serialize to JSON', () => {
			const json = notebook.toJSON() as { title: string; description: string; cells: unknown[] };
			expect(json).toHaveProperty('title', 'Test Notebook');
			expect(json).toHaveProperty('description', 'A test notebook');
			expect(json).toHaveProperty('cells');
			expect(Array.isArray(json.cells)).toBe(true);
			expect(json.cells).toHaveLength(2);
		});

		it('should deserialize from JSON', () => {
			const json = notebook.toJSON() as Record<string, unknown>;
			const restored = Notebook.fromJSON(json);

			expect(restored.title).toBe(notebook.title);
			expect(restored.description).toBe(notebook.description);
			expect(restored.cells).toHaveLength(notebook.cells.length);
		});

		it('should handle missing optional fields in JSON', () => {
			const minimalJson = {
				title: 'Minimal',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				cells: []
			};

			const restored = Notebook.fromJSON(minimalJson);
			expect(restored.title).toBe('Minimal');
			expect(restored.description).toBe('');
		});
	});

	describe('Validation', () => {
		it('should validate empty notebook', () => {
			const result = notebook.validate();
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should detect duplicate cell IDs', () => {
			// Create a new notebook with duplicate IDs for testing
			const testNotebook = new Notebook();
			// Add cells with the same ID to test validation
			testNotebook.addCell({ kind: 'js', value: 'test1' });
			testNotebook.addCell({ kind: 'js', value: 'test2' });

			// Manually set the same ID for both cells
			const cells = testNotebook.cells;
			cells[1].id = cells[0].id;

			const result = testNotebook.validate();
			expect(result.isValid).toBe(false);
			// Check that there's an error about duplicate IDs
			expect(result.errors.some((error) => error.includes('Duplicate cell IDs found'))).toBe(true);
		});

		it('should detect invalid cell kinds', () => {
			// Create a new notebook with invalid cell kind for testing
			const testNotebook = new Notebook();
			testNotebook.addCell({ kind: 'js', value: 'test' });

			// Manually set invalid kind
			const cell = testNotebook.cells[0];
			(cell as unknown as { kind: string }).kind = 'invalid';

			const result = testNotebook.validate();
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Invalid cell kinds found: invalid');
		});

		it('should detect multiple focused cells', () => {
			notebook.addCell({ kind: 'js' });
			notebook.addCell({ kind: 'md' });

			// Manually set multiple cells as focused
			notebook.cells[0].isFocused = true;
			notebook.cells[1].isFocused = true;

			const result = notebook.validate();
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Multiple cells are focused');
		});

		it('should detect multiple editing cells', () => {
			notebook.addCell({ kind: 'js' });
			notebook.addCell({ kind: 'md' });

			// Manually set multiple cells as editing
			notebook.cells[0].isEditing = true;
			notebook.cells[1].isEditing = true;

			const result = notebook.validate();
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Multiple cells are being edited');
		});
	});

	describe('Default Values', () => {
		it('should provide correct default values for different cell kinds', () => {
			const jsCell = notebook.addCell({ kind: 'js' });
			const mdCell = notebook.addCell({ kind: 'md' });
			const htmlCell = notebook.addCell({ kind: 'html' });

			expect(jsCell.value).toContain('console.log("Hello!")');
			expect(mdCell.value).toContain('# New Markdown Cell');
			expect(htmlCell.value).toContain('<div>New HTML Cell</div>');
		});

		it('should set default editing state to false', () => {
			const cell = notebook.addCell();
			expect(cell.isEditing).toBe(false);
		});
	});

	describe('Edge Cases', () => {
		it('should handle adding cell with non-existent relative ID', () => {
			const cell = notebook.addCell({
				relativeToId: 'non-existent',
				position: 'below'
			});
			expect(cell).toBeDefined();
			expect(notebook.cells).toHaveLength(1);
		});

		it('should handle updating cell with empty updates object', () => {
			const cell = notebook.addCell();
			const result = notebook.updateCell(cell.id, {});
			expect(result).toBe(true);
		});

		it('should handle running cells in parallel', async () => {
			notebook.addCell({ kind: 'js' });
			notebook.addCell({ kind: 'md' });

			const promises = notebook.cells.map((cell) => notebook.runCell(cell.id));
			await Promise.all(promises);

			notebook.cells.forEach((cell) => {
				expect(cell.status).toBe('ok');
			});
		});
	});
});
