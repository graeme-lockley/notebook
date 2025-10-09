import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotebookLoaderService } from './notebook-loader.service';
import type { NotebookResponse } from '$lib/client/server/server-queries';

// Mock the dependencies
vi.mock('$lib/client/server/server-queries', () => ({
	getNotebook: vi.fn()
}));

vi.mock('$lib/common/infrastructure/logging/logger.service', () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		configure: vi.fn()
	}
}));

import * as ServerQuery from '$lib/client/server/server-queries';

describe('NotebookLoaderService', () => {
	let service: NotebookLoaderService;

	beforeEach(() => {
		service = new NotebookLoaderService();
		vi.clearAllMocks();
	});

	describe('loadNotebook', () => {
		it('should load notebook with cells', async () => {
			const mockNotebookData: NotebookResponse = {
				title: 'Test Notebook',
				description: 'Test Description',
				cells: [
					{ id: 'cell-1', kind: 'js', value: 'console.log("test")' },
					{ id: 'cell-2', kind: 'md', value: '# Hello' }
				]
			};

			vi.mocked(ServerQuery.getNotebook).mockResolvedValue(mockNotebookData);

			const result = await service.loadNotebook('notebook-1');

			expect(result).toBeDefined();
			expect(result.notebook).toBeDefined();
			expect(result.store).toBeDefined();
			expect(result.notebook.title).toBe('Test Notebook');
			expect(result.notebook.description).toBe('Test Description');
			expect(result.notebook.cells.length).toBe(2);
		});

		it('should handle notebook with no cells', async () => {
			const mockNotebookData: NotebookResponse = {
				title: 'Empty Notebook',
				description: '',
				cells: []
			};

			vi.mocked(ServerQuery.getNotebook).mockResolvedValue(mockNotebookData);

			const result = await service.loadNotebook('notebook-2');

			expect(result.notebook.cells.length).toBe(0);
			expect(result.notebook.title).toBe('Empty Notebook');
		});

		it('should handle notebook with missing description', async () => {
			const mockNotebookData: NotebookResponse = {
				title: 'No Description',
				description: undefined,
				cells: []
			};

			vi.mocked(ServerQuery.getNotebook).mockResolvedValue(mockNotebookData);

			const result = await service.loadNotebook('notebook-3');

			expect(result.notebook.description).toBe('');
		});

		it('should throw error when API call fails', async () => {
			const error = new Error('Network error');
			vi.mocked(ServerQuery.getNotebook).mockRejectedValue(error);

			await expect(service.loadNotebook('notebook-fail')).rejects.toThrow('Network error');
		});

		it('should call ServerQuery.getNotebook with correct ID', async () => {
			const mockNotebookData: NotebookResponse = {
				title: 'Test',
				description: '',
				cells: []
			};

			vi.mocked(ServerQuery.getNotebook).mockResolvedValue(mockNotebookData);

			await service.loadNotebook('notebook-4');

			expect(ServerQuery.getNotebook).toHaveBeenCalledWith('notebook-4');
			expect(ServerQuery.getNotebook).toHaveBeenCalledTimes(1);
		});
	});

	describe('reloadNotebook', () => {
		it('should reload notebook successfully', async () => {
			const mockNotebookData: NotebookResponse = {
				title: 'Reload Test',
				description: '',
				cells: []
			};

			vi.mocked(ServerQuery.getNotebook).mockResolvedValue(mockNotebookData);

			const result = await service.reloadNotebook('notebook-5');

			expect(result).toBeDefined();
			expect(result.notebook.title).toBe('Reload Test');
			expect(ServerQuery.getNotebook).toHaveBeenCalledWith('notebook-5');
		});

		it('should handle reload errors', async () => {
			const error = new Error('Reload failed');
			vi.mocked(ServerQuery.getNotebook).mockRejectedValue(error);

			await expect(service.reloadNotebook('notebook-fail')).rejects.toThrow('Reload failed');
		});
	});

	describe('cell loading', () => {
		it('should preserve cell order', async () => {
			const mockNotebookData: NotebookResponse = {
				title: 'Order Test',
				description: '',
				cells: [
					{ id: 'cell-1', kind: 'js', value: 'first' },
					{ id: 'cell-2', kind: 'js', value: 'second' },
					{ id: 'cell-3', kind: 'js', value: 'third' }
				]
			};

			vi.mocked(ServerQuery.getNotebook).mockResolvedValue(mockNotebookData);

			const result = await service.loadNotebook('notebook-6');

			expect(result.notebook.cells[0].value).toBe('first');
			expect(result.notebook.cells[1].value).toBe('second');
			expect(result.notebook.cells[2].value).toBe('third');
		});

		it('should not focus cells during load', async () => {
			const mockNotebookData: NotebookResponse = {
				title: 'Focus Test',
				description: '',
				cells: [{ id: 'cell-1', kind: 'js', value: 'test' }]
			};

			vi.mocked(ServerQuery.getNotebook).mockResolvedValue(mockNotebookData);

			const result = await service.loadNotebook('notebook-7');

			expect(result.notebook.focusedCell).toBeNull();
			expect(result.notebook.cells[0].isFocused).toBe(false);
		});
	});
});
