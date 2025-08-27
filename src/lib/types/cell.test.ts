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
					kind: 'md',
					status: 'error'
				});
				expect(result).toBe(true);
				expect(cell.value).toBe('Updated value');
				expect(cell.kind).toBe('md');
				expect(cell.status).toBe('error');
			});

			it('should return false for non-existent cell', () => {
				const result = notebook.updateCell('non-existent', { value: 'test' });
				expect(result).toBe(false);
			});

			it('should update version when updating cell', () => {
				const cell = notebook.addCell();
				const originalVersion = notebook.version;
				notebook.updateCell(cell.id, { value: 'Updated' });
				expect(notebook.version).toBe(originalVersion + 1);
			});

			it('should update timestamp when updating cell', () => {
				const cell = notebook.addCell();
				const originalTimestamp = notebook.updatedAt.getTime();
				// Small delay to ensure timestamp difference
				setTimeout(() => {
					notebook.updateCell(cell.id, { value: 'Updated' });
					expect(notebook.updatedAt.getTime()).toBeGreaterThan(originalTimestamp);
				}, 1);
			});
		});

		describe('getCell', () => {
			it('should return cell by ID', () => {
				const cell = notebook.addCell();
				const foundCell = notebook.getCell(cell.id);
				expect(foundCell).toBe(cell);
			});

			it('should return null for non-existent cell', () => {
				const foundCell = notebook.getCell('non-existent');
				expect(foundCell).toBeNull();
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
				const result = notebook.moveCellUp(notebook.cells[0].id);
				expect(result).toBe(false);
			});

			it('should return false for non-existent cell', () => {
				const result = notebook.moveCellUp('non-existent');
				expect(result).toBe(false);
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
				const result = notebook.moveCellDown(notebook.cells[2].id);
				expect(result).toBe(false);
			});

			it('should return false for non-existent cell', () => {
				const result = notebook.moveCellDown('non-existent');
				expect(result).toBe(false);
			});
		});
	});

	describe('Cell Duplication', () => {
		beforeEach(() => {
			notebook.addCell({ kind: 'js' });
			notebook.addCell({ kind: 'md' });
			notebook.addCell({ kind: 'html' });
		});

		describe('duplicateCell', () => {
			it('should duplicate a cell', () => {
				const originalCell = notebook.cells[0];
				const duplicatedCell = notebook.duplicateCell(originalCell.id);

				expect(duplicatedCell).not.toBeNull();
				expect(duplicatedCell!.id).not.toBe(originalCell.id);
				expect(duplicatedCell!.kind).toBe(originalCell.kind);
				expect(duplicatedCell!.value).toBe(originalCell.value);
				expect(duplicatedCell!.status).toBe(originalCell.status);
				expect(duplicatedCell!.isClosed).toBe(originalCell.isClosed);
				expect(duplicatedCell!.hasError).toBe(originalCell.hasError);
			});

			it('should place duplicate after original cell', () => {
				const originalCell = notebook.cells[0];
				const duplicatedCell = notebook.duplicateCell(originalCell.id);

				expect(duplicatedCell).not.toBeNull();
				const originalIndex = notebook.cells.findIndex((cell) => cell.id === originalCell.id);
				const duplicateIndex = notebook.cells.findIndex((cell) => cell.id === duplicatedCell!.id);
				expect(duplicateIndex).toBe(originalIndex + 1);
			});

			it('should reset focus state on duplicate', () => {
				const originalCell = notebook.cells[0];
				originalCell.isFocused = true;

				const duplicatedCell = notebook.duplicateCell(originalCell.id);

				expect(duplicatedCell).not.toBeNull();
				expect(duplicatedCell!.isFocused).toBe(false);
			});

			it('should return null for non-existent cell', () => {
				const result = notebook.duplicateCell('non-existent');
				expect(result).toBeNull();
			});

			it('should generate unique ID for duplicate', () => {
				const originalCell = notebook.cells[0];
				const duplicatedCell = notebook.duplicateCell(originalCell.id);

				expect(duplicatedCell).not.toBeNull();
				expect(duplicatedCell!.id).not.toBe(originalCell.id);

				// Check that the ID is unique among all cells
				const allIds = notebook.cells.map((cell) => cell.id);
				const duplicateCount = allIds.filter((id) => id === duplicatedCell!.id).length;
				expect(duplicateCount).toBe(1);
			});

			it('should update version when duplicating cell', () => {
				const originalVersion = notebook.version;
				notebook.duplicateCell(notebook.cells[0].id);
				expect(notebook.version).toBe(originalVersion + 1);
			});

			it('should update timestamp when duplicating cell', () => {
				const originalTimestamp = notebook.updatedAt.getTime();
				// Small delay to ensure timestamp difference
				setTimeout(() => {
					notebook.duplicateCell(notebook.cells[0].id);
					expect(notebook.updatedAt.getTime()).toBeGreaterThan(originalTimestamp);
				}, 1);
			});

			it('should duplicate cell with all properties', () => {
				const originalCell = notebook.cells[0];
				// Set some custom properties
				originalCell.value = 'Custom value';
				originalCell.status = 'error';
				originalCell.hasError = true;
				originalCell.isClosed = false;
				originalCell.console = ['log1', 'log2'];
				originalCell.valueHtml = '<div>Custom HTML</div>';

				const duplicatedCell = notebook.duplicateCell(originalCell.id);

				expect(duplicatedCell).not.toBeNull();
				expect(duplicatedCell!.value).toBe('Custom value');
				expect(duplicatedCell!.status).toBe('error');
				expect(duplicatedCell!.hasError).toBe(true);
				expect(duplicatedCell!.isClosed).toBe(false);
				expect(duplicatedCell!.console).toEqual(['log1', 'log2']);
				expect(duplicatedCell!.valueHtml).toBe('<div>Custom HTML</div>');
			});

			it('should handle duplicating last cell', () => {
				const lastCell = notebook.cells[2];
				const duplicatedCell = notebook.duplicateCell(lastCell.id);

				expect(duplicatedCell).not.toBeNull();
				expect(notebook.cells[3]).toBe(duplicatedCell);
			});

			it('should handle duplicating first cell', () => {
				const firstCell = notebook.cells[0];
				const duplicatedCell = notebook.duplicateCell(firstCell.id);

				expect(duplicatedCell).not.toBeNull();
				expect(notebook.cells[1]).toBe(duplicatedCell);
			});
		});
	});

	describe('Notebook Metadata', () => {
		it('should update title', () => {
			const newTitle = 'Updated Title';
			notebook.updateTitle(newTitle);
			expect(notebook.title).toBe(newTitle);
		});

		it('should update description', () => {
			const newDescription = 'Updated Description';
			notebook.updateDescription(newDescription);
			expect(notebook.description).toBe(newDescription);
		});

		it('should update version when changing metadata', () => {
			const originalVersion = notebook.version;
			notebook.updateTitle('New Title');
			expect(notebook.version).toBe(originalVersion + 1);
		});

		it('should update timestamp when changing metadata', () => {
			const originalTimestamp = notebook.updatedAt.getTime();
			// Small delay to ensure timestamp difference
			setTimeout(() => {
				notebook.updateTitle('New Title');
				expect(notebook.updatedAt.getTime()).toBeGreaterThan(originalTimestamp);
			}, 1);
		});
	});

	describe('Serialization', () => {
		beforeEach(() => {
			notebook.addCell({ kind: 'js', value: 'console.log("test")' });
			notebook.addCell({ kind: 'md', value: '# Test' });
		});

		it('should serialize to JSON', () => {
			const json = notebook.toJSON() as Record<string, unknown>;
			expect(json).toHaveProperty('title');
			expect(json).toHaveProperty('description');
			expect(json).toHaveProperty('createdAt');
			expect(json).toHaveProperty('updatedAt');
			expect(json).toHaveProperty('cells');
			expect(Array.isArray(json.cells)).toBe(true);
			expect((json.cells as unknown[]).length).toBe(2);
		});

		it('should deserialize from JSON', () => {
			const json = notebook.toJSON() as Record<string, unknown>;
			const deserializedNotebook = Notebook.fromJSON(json);

			expect(deserializedNotebook.title).toBe(notebook.title);
			expect(deserializedNotebook.description).toBe(notebook.description);
			expect(deserializedNotebook.cells).toHaveLength(notebook.cells.length);
			expect(deserializedNotebook.cells[0].kind).toBe(notebook.cells[0].kind);
			expect(deserializedNotebook.cells[0].value).toBe(notebook.cells[0].value);
		});

		it('should handle empty notebook serialization', () => {
			const emptyNotebook = new Notebook();
			const json = emptyNotebook.toJSON() as Record<string, unknown>;
			expect((json.cells as unknown[]).length).toBe(0);
		});

		it('should handle empty notebook deserialization', () => {
			const emptyNotebook = new Notebook();
			const json = emptyNotebook.toJSON() as Record<string, unknown>;
			const deserializedNotebook = Notebook.fromJSON(json);
			expect(deserializedNotebook.cells).toHaveLength(0);
		});
	});

	describe('Validation', () => {
		beforeEach(() => {
			notebook.addCell({ kind: 'js' });
			notebook.addCell({ kind: 'md' });
		});

		it('should validate valid notebook', () => {
			const result = notebook.validate();
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should detect duplicate cell IDs', () => {
			// Manually create duplicate ID
			notebook.cells[1].id = notebook.cells[0].id;

			const result = notebook.validate();
			expect(result.isValid).toBe(false);
			expect(result.errors.some((error) => error.includes('Duplicate cell IDs found'))).toBe(true);
		});

		it('should detect invalid cell kinds', () => {
			// Manually set invalid kind
			(notebook.cells[0] as { kind: string }).kind = 'invalid';

			const result = notebook.validate();
			expect(result.isValid).toBe(false);
			expect(result.errors.some((error) => error.includes('Invalid cell kinds found'))).toBe(true);
		});

		it('should detect multiple focused cells', () => {
			// Manually set multiple cells as focused
			notebook.cells[0].isFocused = true;
			notebook.cells[1].isFocused = true;

			const result = notebook.validate();
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Multiple cells are focused');
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
	});

	describe('Edge Cases', () => {
		beforeEach(() => {
			// Ensure we have cells for edge case tests
			notebook.addCell({ kind: 'js' });
			notebook.addCell({ kind: 'md' });
			notebook.addCell({ kind: 'html' });
		});

		it('should handle adding cell with non-existent relative ID', () => {
			const cell = notebook.addCell({
				relativeToId: 'non-existent',
				position: 'below'
			});
			expect(cell).toBeDefined();
			expect(notebook.cells).toHaveLength(4); // 3 from beforeEach + 1 new
		});

		it('should handle updating cell with empty updates object', () => {
			const cell = notebook.cells[0];
			const result = notebook.updateCell(cell.id, {});
			expect(result).toBe(true);
		});

		it('should handle moving cells multiple times in sequence', () => {
			const cell = notebook.cells[1];

			// Move up then down
			notebook.moveCellUp(cell.id);
			expect(notebook.cells[0]).toBe(cell);

			notebook.moveCellDown(cell.id);
			expect(notebook.cells[1]).toBe(cell);
		});

		it('should handle duplicating multiple cells in sequence', () => {
			const originalCell = notebook.cells[0];
			const firstDuplicate = notebook.duplicateCell(originalCell.id);
			const secondDuplicate = notebook.duplicateCell(originalCell.id);

			expect(firstDuplicate).not.toBeNull();
			expect(secondDuplicate).not.toBeNull();
			expect(firstDuplicate!.id).not.toBe(secondDuplicate!.id);
			expect(notebook.cells.length).toBe(5); // 3 original + 2 duplicates
		});

		it('should handle moving and duplicating the same cell', () => {
			const cell = notebook.cells[0];

			// Move the cell down
			notebook.moveCellDown(cell.id);
			expect(notebook.cells[1]).toBe(cell);

			// Duplicate the moved cell
			const duplicate = notebook.duplicateCell(cell.id);
			expect(duplicate).not.toBeNull();
			expect(notebook.cells[2]).toBe(duplicate);
		});

		it('should handle operations on empty notebook gracefully', () => {
			const emptyNotebook = new Notebook();

			expect(emptyNotebook.moveCellUp('any-id')).toBe(false);
			expect(emptyNotebook.moveCellDown('any-id')).toBe(false);
			expect(emptyNotebook.duplicateCell('any-id')).toBeNull();
		});

		it('should handle operations on single cell notebook', () => {
			const singleCellNotebook = new Notebook();
			const cell = singleCellNotebook.addCell();

			// Should not be able to move up or down with only one cell
			expect(singleCellNotebook.moveCellUp(cell.id)).toBe(false);
			expect(singleCellNotebook.moveCellDown(cell.id)).toBe(false);

			// Should be able to duplicate
			const duplicate = singleCellNotebook.duplicateCell(cell.id);
			expect(duplicate).not.toBeNull();
			expect(singleCellNotebook.cells.length).toBe(2);
		});
	});
});
