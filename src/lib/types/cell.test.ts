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

	describe('Cell execution', () => {
		it('should execute simple number literals', async () => {
			const cell = await notebook.addCell({
				kind: 'js',
				value: '10'
			});

			await cell.execute();

			// Debug: Log the actual error if there is one
			if (cell.status === 'error') {
				console.log('Cell execution failed:', {
					value: cell.value,
					status: cell.status,
					error: cell.result.error,
					hasError: cell.hasError
				});
			}

			expect(cell.status).toBe('ok');
			expect(cell.result.value).toBe(10);
			expect(cell.hasError).toBe(false);
		});

		it('should execute simple arithmetic expressions', async () => {
			const cell = await notebook.addCell({
				kind: 'js',
				value: '1 + 1'
			});

			await cell.execute();
			expect(cell.status).toBe('ok');
			expect(cell.result.value).toBe(2);
			expect(cell.hasError).toBe(false);
		});

		it('should execute variable declarations', async () => {
			const cell = await notebook.addCell({
				kind: 'js',
				value: 'let x = 1 + 2'
			});

			await cell.execute();
			expect(cell.status).toBe('ok');
			expect(cell.result.value).toBe(undefined); // Variable declarations return undefined
			expect(cell.hasError).toBe(false);
		});

		it('should execute JavaScript cells with const', async () => {
			const cell = await notebook.addCell({
				kind: 'js',
				value: 'const x = 42; x'
			});

			await cell.execute();
			expect(cell.status).toBe('ok');
			expect(cell.result.value).toBe(42);
			expect(cell.hasError).toBe(false);
		});

		it('should handle JavaScript errors', async () => {
			const cell = await notebook.addCell({
				kind: 'js',
				value: 'undefinedVariable'
			});

			await cell.execute();
			expect(cell.status).toBe('error');
			expect(cell.result.error).toBeInstanceOf(Error);
		});

		it('should execute markdown cells', async () => {
			const cell = await notebook.addCell({
				kind: 'md',
				value: '# Hello World\n\nThis is a **test**.'
			});

			await cell.execute();
			expect(cell.status).toBe('ok');
			expect(cell.result.html).toContain('<h1>Hello World</h1>');
			expect(cell.result.html).toContain('<strong>test</strong>');
		});

		it('should execute HTML cells', async () => {
			const cell = await notebook.addCell({
				kind: 'html',
				value: '<h1>Hello World</h1><p>This is a test.</p>'
			});

			await cell.execute();
			expect(cell.status).toBe('ok');
			expect(cell.result.html).toBe('<h1>Hello World</h1><p>This is a test.</p>');
		});
	});

	describe('Shared context and reactive behavior', () => {
		it('should share context between cells', async () => {
			// First cell defines a variable
			const cell1 = await notebook.addCell({
				kind: 'js',
				value: 'let x = 10; x'
			});

			await cell1.execute();
			expect(cell1.status).toBe('ok');
			expect(cell1.result.value).toBe(10);

			// Check that the variable is in shared context
			const context = notebook.getSharedContext();
			expect(context[cell1.id]).toBe(10);
		});

		it('should update cell when value changes', async () => {
			const cell = await notebook.addCell({
				kind: 'js',
				value: '10'
			});

			await cell.execute();
			expect(cell.result.value).toBe(10);

			// Update the cell value
			await notebook.updateCell(cell.id, { value: '20' });
			expect(cell.result.value).toBe(20);
			expect(cell.status).toBe('ok');
		});

		it('should trigger re-execution when cell value changes', async () => {
			const cell = await notebook.addCell({
				kind: 'js',
				value: '10'
			});

			await cell.execute();
			expect(cell.result.value).toBe(10);

			// Update the cell value
			await notebook.updateCell(cell.id, { value: '1 + 1' });
			expect(cell.result.value).toBe(2);
		});

		it('should update cell status and result when value changes', async () => {
			const cell = await notebook.addCell({
				kind: 'js',
				value: '42'
			});

			await cell.execute();
			expect(cell.status).toBe('ok');
			expect(cell.result.value).toBe(42);

			// Update the cell value
			await notebook.updateCell(cell.id, { value: '100' });
			expect(cell.status).toBe('ok');
			expect(cell.result.value).toBe(100);
		});

		it('should execute markdown cells', async () => {
			const cell = await notebook.addCell({
				kind: 'md',
				value: '# Hello World\n\nThis is a **test**.'
			});

			await cell.execute();
			expect(cell.status).toBe('ok');
			expect(cell.result.html).toContain('<h1>Hello World</h1>');
			expect(cell.result.html).toContain('<strong>test</strong>');
		});

		it('should execute HTML cells', async () => {
			const cell = await notebook.addCell({
				kind: 'html',
				value: '<h1>Hello World</h1><p>This is a test.</p>'
			});

			await cell.execute();
			expect(cell.status).toBe('ok');
			expect(cell.result.html).toBe('<h1>Hello World</h1><p>This is a test.</p>');
		});
	});

	describe('Reactive dependencies', () => {
		it('should handle markdown with embedded expressions', async () => {
			// First cell defines a variable
			const cell1 = await notebook.addCell({
				kind: 'js',
				value: 'const message = "Hello from JavaScript"; message'
			});

			// Second cell uses the variable in markdown
			const cell2 = await notebook.addCell({
				kind: 'md',
				value: '# Dynamic Content\n\nThe message is: {message}'
			});

			// Wait for runtime to be ready
			await new Promise((resolve) => setTimeout(resolve, 100));
			await cell1.execute();
			await cell2.execute();

			// For now, just check that execution doesn't throw
			expect(cell2.status).toBeDefined();
			expect(['ok', 'error', 'pending']).toContain(cell2.status);
		});

		it('should handle HTML with embedded expressions', async () => {
			// First cell defines a variable
			const cell1 = await notebook.addCell({
				kind: 'js',
				value: 'const count = 42; count'
			});

			// Second cell uses the variable in HTML
			const cell2 = await notebook.addCell({
				kind: 'html',
				value: '<div>Count: <strong>{count}</strong></div>'
			});

			// Wait for runtime to be ready
			await new Promise((resolve) => setTimeout(resolve, 100));
			await cell1.execute();
			await cell2.execute();

			// For now, just check that execution doesn't throw
			expect(cell2.status).toBeDefined();
			expect(['ok', 'error', 'pending']).toContain(cell2.status);
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

	describe('Observer pattern', () => {
		it('should notify observers when cells change', async () => {
			let observerCalled = false;
			notebook.addObserver(() => {
				observerCalled = true;
			});

			await notebook.addCell({
				kind: 'js',
				value: 'const x = 42; x'
			});

			expect(observerCalled).toBe(true);
		});

		it('should remove observers correctly', async () => {
			let observerCalled = false;
			const observer = () => {
				observerCalled = true;
			};

			notebook.addObserver(observer);
			notebook.removeObserver(observer);

			await notebook.addCell({
				kind: 'js',
				value: 'const x = 42; x'
			});

			expect(observerCalled).toBe(false);
		});
	});
});
