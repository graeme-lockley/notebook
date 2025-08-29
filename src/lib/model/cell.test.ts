import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReactiveNotebook, ReactiveCell } from './cell';

describe('ReactiveNotebook', () => {
	let notebook: ReactiveNotebook;

	beforeEach(async () => {
		notebook = new ReactiveNotebook({
			title: 'Test Notebook',
			description: 'A test notebook'
		});
	});

	afterEach(() => {
		notebook.dispose();
	});

	describe('Basic functionality', () => {
		it('should create a notebook with correct properties', () => {
			expect(notebook.title).toBe('Test Notebook');
			expect(notebook.description).toBe('A test notebook');
			expect(notebook.cells).toHaveLength(0);
			expect(notebook.focusedCell).toBeNull();
		});

		it('should add cells correctly', async () => {
			const cell = await notebook.addCell({
				kind: 'js',
				value: 'const x = 42; x'
			});

			expect(notebook.cells).toHaveLength(1);
			expect(cell).toBeInstanceOf(ReactiveCell);
			expect(cell.kind).toBe('js');
			expect(cell.value).toBe('const x = 42; x');
		});

		it('should remove cells correctly', async () => {
			const cell = await notebook.addCell({
				kind: 'js',
				value: 'const x = 42; x'
			});

			expect(notebook.cells).toHaveLength(1);

			notebook.removeCell(cell.id);
			expect(notebook.cells).toHaveLength(0);
		});

		it('should update cell content', async () => {
			const cell = await notebook.addCell({
				kind: 'js',
				value: 'const x = 42; x'
			});

			await notebook.updateCell(cell.id, { value: 'const y = 100; y' });
			expect(cell.value).toBe('const y = 100; y');
		});

		it('should set focus correctly', async () => {
			const cell1 = await notebook.addCell({
				kind: 'js',
				value: 'const x = 42; x'
			});
			const cell2 = await notebook.addCell({
				kind: 'js',
				value: 'const y = 100; y'
			});

			notebook.setFocus(cell2.id);
			expect(notebook.focusedCell).toBe(cell2);
			expect(cell1.isFocused).toBe(false);
			expect(cell2.isFocused).toBe(true);
		});
	});

	describe('Cell management', () => {
		it('should move cells up and down', async () => {
			const cell1 = await notebook.addCell({
				kind: 'js',
				value: 'const x = 1; x'
			});
			const cell2 = await notebook.addCell({
				kind: 'js',
				value: 'const y = 2; y'
			});

			expect(notebook.cells[0]).toBe(cell1);
			expect(notebook.cells[1]).toBe(cell2);

			notebook.moveCellUp(cell2.id);
			expect(notebook.cells[0]).toBe(cell2);
			expect(notebook.cells[1]).toBe(cell1);

			notebook.moveCellDown(cell2.id);
			expect(notebook.cells[0]).toBe(cell1);
			expect(notebook.cells[1]).toBe(cell2);
		});

		it('should duplicate cells', async () => {
			const originalCell = await notebook.addCell({
				kind: 'js',
				value: 'const x = 42; x'
			});

			const duplicatedCell = await notebook.duplicateCell(originalCell.id);

			expect(notebook.cells).toHaveLength(2);
			expect(duplicatedCell?.kind).toBe(originalCell.kind);
			expect(duplicatedCell?.value).toBe(originalCell.value);
			expect(duplicatedCell?.id).not.toBe(originalCell.id);
		});

		it('should toggle cell closed state', async () => {
			const cell = await notebook.addCell({
				kind: 'js',
				value: 'const x = 42; x'
			});

			expect(cell.isClosed).toBe(true);

			notebook.toggleClosed(cell.id);
			expect(cell.isClosed).toBe(false);

			notebook.toggleClosed(cell.id);
			expect(cell.isClosed).toBe(true);
		});
	});
});
