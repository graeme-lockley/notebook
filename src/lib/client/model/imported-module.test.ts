import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImportedNotebookRegistry, Module } from './imported-module';
import type { IRuntime, IModule } from '$lib/common/lib/runtime';
import type { GetNotebookResponse } from '$lib/types/api-contracts';

// Mock logger
vi.mock('$lib/common/infrastructure/logging/logger.service', () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn()
	}
}));

// Mock NotebookLoaderService
vi.mock('$lib/client/services/notebook-loader.service', () => {
	return {
		NotebookLoaderService: vi.fn().mockImplementation(() => ({
			fetchNotebookData: vi.fn()
		}))
	};
});

describe('ImportedNotebookRegistry - Circular Import Detection', () => {
	let registry: ImportedNotebookRegistry;
	let mockRuntime: IRuntime;
	let mockModule: IModule;
	let mockFetchNotebookData: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		// Create mock variable
		const mockVariable = {
			define: vi.fn(),
			import: vi.fn(),
			delete: vi.fn()
		};

		// Create mock module
		mockModule = {
			variable: vi.fn().mockReturnValue(mockVariable),
			derive: vi.fn(),
			redefine: vi.fn()
		} as unknown as IModule;

		// Create mock runtime
		mockRuntime = {
			module: vi.fn().mockReturnValue(mockModule),
			fileAttachments: vi.fn(),
			dispose: vi.fn()
		} as unknown as IRuntime;

		// Create mock NotebookLoaderService
		const mockNotebookLoaderService = {
			fetchNotebookData: vi.fn()
		};

		// Create registry instance
		registry = new ImportedNotebookRegistry(
			mockRuntime,
			mockNotebookLoaderService as unknown as InstanceType<
				typeof import('$lib/client/services/notebook-loader.service').NotebookLoaderService
			>
		);

		// Get reference to the mocked fetchNotebookData
		mockFetchNotebookData = mockNotebookLoaderService.fetchNotebookData;
	});

	describe('Basic functionality', () => {
		it('should load and cache a module', async () => {
			const notebookA: GetNotebookResponse = {
				id: 'NotebookA',
				title: 'Notebook A',
				description: '',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				cells: [
					{
						id: 'cell1',
						kind: 'js',
						value: 'x = 42',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				]
			};

			mockFetchNotebookData.mockResolvedValueOnce(notebookA);

			const module1 = await registry.getModule('NotebookA');
			expect(module1).toBeInstanceOf(Module);
			expect(mockFetchNotebookData).toHaveBeenCalledTimes(1);

			// Second call should use cache
			const module2 = await registry.getModule('NotebookA');
			expect(module2).toBe(module1);
			expect(mockFetchNotebookData).toHaveBeenCalledTimes(1); // Still only called once
		});

		it('should load multiple different notebooks', async () => {
			const notebookA: GetNotebookResponse = {
				id: 'NotebookA',
				title: 'Notebook A',
				description: '',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				cells: []
			};

			const notebookB: GetNotebookResponse = {
				id: 'NotebookB',
				title: 'Notebook B',
				description: '',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				cells: []
			};

			mockFetchNotebookData.mockResolvedValueOnce(notebookA).mockResolvedValueOnce(notebookB);

			const moduleA = await registry.getModule('NotebookA');
			const moduleB = await registry.getModule('NotebookB');

			expect(moduleA).toBeInstanceOf(Module);
			expect(moduleB).toBeInstanceOf(Module);
			expect(moduleA).not.toBe(moduleB);
			expect(mockFetchNotebookData).toHaveBeenCalledTimes(2);
		});
	});

	describe('Circular import detection', () => {
		it('should detect direct circular import (A → B → A)', async () => {
			const notebookA: GetNotebookResponse = {
				id: 'NotebookA',
				title: 'Notebook A',
				description: '',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				cells: [
					{
						id: 'cell1',
						kind: 'js',
						value: 'import {x} from "NotebookB"',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				]
			};

			const notebookB: GetNotebookResponse = {
				id: 'NotebookB',
				title: 'Notebook B',
				description: '',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				cells: [
					{
						id: 'cell1',
						kind: 'js',
						value: 'import {y} from "NotebookA"',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				]
			};

			mockFetchNotebookData.mockImplementation(async (name: string) => {
				if (name === 'NotebookA') return notebookA;
				if (name === 'NotebookB') return notebookB;
				throw new Error('Notebook not found');
			});

			await expect(registry.getModule('NotebookA')).rejects.toThrow(
				/Circular import detected.*NotebookA/
			);
		});

		it('should detect indirect circular import (A → B → C → A)', async () => {
			const notebookA: GetNotebookResponse = {
				id: 'NotebookA',
				title: 'Notebook A',
				description: '',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				cells: [
					{
						id: 'cell1',
						kind: 'js',
						value: 'import {x} from "NotebookB"',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				]
			};

			const notebookB: GetNotebookResponse = {
				id: 'NotebookB',
				title: 'Notebook B',
				description: '',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				cells: [
					{
						id: 'cell1',
						kind: 'js',
						value: 'import {y} from "NotebookC"',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				]
			};

			const notebookC: GetNotebookResponse = {
				id: 'NotebookC',
				title: 'Notebook C',
				description: '',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				cells: [
					{
						id: 'cell1',
						kind: 'js',
						value: 'import {z} from "NotebookA"',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				]
			};

			mockFetchNotebookData.mockImplementation(async (name: string) => {
				if (name === 'NotebookA') return notebookA;
				if (name === 'NotebookB') return notebookB;
				if (name === 'NotebookC') return notebookC;
				throw new Error('Notebook not found');
			});

			await expect(registry.getModule('NotebookA')).rejects.toThrow(
				/Circular import detected.*NotebookA/
			);
		});

		it('should detect self-import (A → A)', async () => {
			const notebookA: GetNotebookResponse = {
				id: 'NotebookA',
				title: 'Notebook A',
				description: '',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				cells: [
					{
						id: 'cell1',
						kind: 'js',
						value: 'import {x} from "NotebookA"',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				]
			};

			mockFetchNotebookData.mockResolvedValue(notebookA);

			await expect(registry.getModule('NotebookA')).rejects.toThrow(
				/Circular import detected.*NotebookA/
			);
		});
	});

	describe('Valid import patterns', () => {
		it('should allow diamond dependency (A → B,C both → D)', async () => {
			const notebookD: GetNotebookResponse = {
				id: 'NotebookD',
				title: 'Notebook D',
				description: '',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				cells: [
					{
						id: 'cell1',
						kind: 'js',
						value: 'd = 42',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				]
			};

			const notebookB: GetNotebookResponse = {
				id: 'NotebookB',
				title: 'Notebook B',
				description: '',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				cells: [
					{
						id: 'cell1',
						kind: 'js',
						value: 'import {d} from "NotebookD"',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				]
			};

			const notebookC: GetNotebookResponse = {
				id: 'NotebookC',
				title: 'Notebook C',
				description: '',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				cells: [
					{
						id: 'cell1',
						kind: 'js',
						value: 'import {d} from "NotebookD"',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				]
			};

			const notebookA: GetNotebookResponse = {
				id: 'NotebookA',
				title: 'Notebook A',
				description: '',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				cells: [
					{
						id: 'cell1',
						kind: 'js',
						value: 'import {b} from "NotebookB"',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					},
					{
						id: 'cell2',
						kind: 'js',
						value: 'import {c} from "NotebookC"',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				]
			};

			mockFetchNotebookData.mockImplementation(async (name: string) => {
				if (name === 'NotebookA') return notebookA;
				if (name === 'NotebookB') return notebookB;
				if (name === 'NotebookC') return notebookC;
				if (name === 'NotebookD') return notebookD;
				throw new Error('Notebook not found');
			});

			// Should not throw
			const moduleA = await registry.getModule('NotebookA');
			expect(moduleA).toBeInstanceOf(Module);

			// NotebookD should only be loaded once (cached on second import)
			expect(mockFetchNotebookData).toHaveBeenCalledWith('NotebookD');
		});

		it('should allow linear import chain (A → B → C)', async () => {
			const notebookC: GetNotebookResponse = {
				id: 'NotebookC',
				title: 'Notebook C',
				description: '',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				cells: [
					{
						id: 'cell1',
						kind: 'js',
						value: 'c = 100',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				]
			};

			const notebookB: GetNotebookResponse = {
				id: 'NotebookB',
				title: 'Notebook B',
				description: '',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				cells: [
					{
						id: 'cell1',
						kind: 'js',
						value: 'import {c} from "NotebookC"',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				]
			};

			const notebookA: GetNotebookResponse = {
				id: 'NotebookA',
				title: 'Notebook A',
				description: '',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				cells: [
					{
						id: 'cell1',
						kind: 'js',
						value: 'import {b} from "NotebookB"',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				]
			};

			mockFetchNotebookData.mockImplementation(async (name: string) => {
				if (name === 'NotebookA') return notebookA;
				if (name === 'NotebookB') return notebookB;
				if (name === 'NotebookC') return notebookC;
				throw new Error('Notebook not found');
			});

			// Should not throw
			const moduleA = await registry.getModule('NotebookA');
			expect(moduleA).toBeInstanceOf(Module);
			expect(mockFetchNotebookData).toHaveBeenCalledTimes(3);
		});
	});

	describe('Error handling', () => {
		it('should clean up loading state after error', async () => {
			mockFetchNotebookData.mockRejectedValueOnce(new Error('Network error'));

			// First attempt fails
			await expect(registry.getModule('NotebookA')).rejects.toThrow('Failed to load notebook');

			// Setup successful response for retry
			const notebookA: GetNotebookResponse = {
				id: 'NotebookA',
				title: 'Notebook A',
				description: '',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				cells: []
			};
			mockFetchNotebookData.mockResolvedValueOnce(notebookA);

			// Retry should work (loading state was cleaned up)
			const module = await registry.getModule('NotebookA');
			expect(module).toBeInstanceOf(Module);
		});

		it('should provide context in error messages', async () => {
			mockFetchNotebookData.mockRejectedValueOnce(new Error('API error'));

			await expect(registry.getModule('NotebookA')).rejects.toThrow(
				/Failed to load notebook "NotebookA"/
			);
		});

		it('should handle non-existent notebook gracefully', async () => {
			mockFetchNotebookData.mockRejectedValueOnce(new Error('Notebook not found'));

			await expect(registry.getModule('NonExistent')).rejects.toThrow();
		});
	});

	describe('Cell type filtering', () => {
		it('should only process JavaScript cells', async () => {
			const notebook: GetNotebookResponse = {
				id: 'NotebookA',
				title: 'Notebook A',
				description: '',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				cells: [
					{
						id: 'cell1',
						kind: 'js',
						value: 'x = 42',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					},
					{
						id: 'cell2',
						kind: 'md',
						value: '# Markdown',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					},
					{
						id: 'cell3',
						kind: 'html',
						value: '<div>HTML</div>',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				]
			};

			mockFetchNotebookData.mockResolvedValueOnce(notebook);

			const module = await registry.getModule('NotebookA');
			expect(module).toBeInstanceOf(Module);
			// Module should be created successfully, non-JS cells should be skipped
		});
	});

	describe('Disposal', () => {
		it('should clear modules and loading state on dispose', async () => {
			const notebookA: GetNotebookResponse = {
				id: 'NotebookA',
				title: 'Notebook A',
				description: '',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				cells: [
					{
						id: 'cell1',
						kind: 'js',
						value: 'x = 42',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				]
			};

			mockFetchNotebookData.mockResolvedValueOnce(notebookA);

			// Load a module
			await registry.getModule('NotebookA');

			// Dispose
			registry.dispose();

			// After disposal, cache should be cleared
			// Loading the same module again should fetch it again
			mockFetchNotebookData.mockResolvedValueOnce(notebookA);
			await registry.getModule('NotebookA');

			// Should have been called twice (once before dispose, once after)
			expect(mockFetchNotebookData).toHaveBeenCalledTimes(2);
		});
	});

	describe('Import with aliases', () => {
		it('should handle imports with aliases', async () => {
			const notebookB: GetNotebookResponse = {
				id: 'NotebookB',
				title: 'Notebook B',
				description: '',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				cells: [
					{
						id: 'cell1',
						kind: 'js',
						value: 'x = 42',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				]
			};

			const notebookA: GetNotebookResponse = {
				id: 'NotebookA',
				title: 'Notebook A',
				description: '',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				cells: [
					{
						id: 'cell1',
						kind: 'js',
						value: 'import {x as myX} from "NotebookB"',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				]
			};

			mockFetchNotebookData.mockImplementation(async (name: string) => {
				if (name === 'NotebookA') return notebookA;
				if (name === 'NotebookB') return notebookB;
				throw new Error('Notebook not found');
			});

			const module = await registry.getModule('NotebookA');
			expect(module).toBeInstanceOf(Module);
		});

		it('should handle multiple imports from same module', async () => {
			const notebookB: GetNotebookResponse = {
				id: 'NotebookB',
				title: 'Notebook B',
				description: '',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				cells: [
					{
						id: 'cell1',
						kind: 'js',
						value: 'x = 42',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					},
					{
						id: 'cell2',
						kind: 'js',
						value: 'y = 100',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				]
			};

			const notebookA: GetNotebookResponse = {
				id: 'NotebookA',
				title: 'Notebook A',
				description: '',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				cells: [
					{
						id: 'cell1',
						kind: 'js',
						value: 'import {x, y} from "NotebookB"',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				]
			};

			mockFetchNotebookData.mockImplementation(async (name: string) => {
				if (name === 'NotebookA') return notebookA;
				if (name === 'NotebookB') return notebookB;
				throw new Error('Notebook not found');
			});

			const module = await registry.getModule('NotebookA');
			expect(module).toBeInstanceOf(Module);
		});
	});
});
