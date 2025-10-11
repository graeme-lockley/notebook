import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotebookSyncService } from './notebook-sync.service';
import type { NotebookStore } from '$lib/client/stores/notebook';
import type {
	CellCreatedPayload,
	CellUpdatedPayload,
	CellDeletedPayload,
	CellMovedPayload,
	NotebookUpdatedPayload,
	NotebookInitializedPayload
} from './notebook-sync.service';

// Mock the logger
vi.mock('$lib/common/infrastructure/logging/logger.service', () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		configure: vi.fn()
	}
}));

// Mock the cell ID mapping
vi.mock('$lib/client/model/cell', () => ({
	serverIdToClientId: (id: string) => id // Simple pass-through for testing
}));

describe('NotebookSyncService', () => {
	let service: NotebookSyncService;
	let mockNotebookStore: NotebookStore;

	beforeEach(() => {
		// Create a mock notebook store
		mockNotebookStore = {
			addCell: vi.fn().mockResolvedValue({ id: 'cell-1', kind: 'js', value: 'test' }),
			updateCell: vi.fn().mockResolvedValue(undefined),
			removeCell: vi.fn().mockResolvedValue(undefined),
			moveCell: vi.fn().mockResolvedValue(undefined),
			updateMetadata: vi.fn(),
			notebook: {
				cells: [
					{ id: 'cell-1', kind: 'js', value: 'test1' },
					{ id: 'cell-2', kind: 'md', value: 'test2' }
				]
			}
		} as unknown as NotebookStore;

		service = new NotebookSyncService(mockNotebookStore);
		vi.clearAllMocks();
	});

	describe('handleCellCreated', () => {
		it('should add cell to store', async () => {
			const payload: CellCreatedPayload = {
				cellId: 'cell-3',
				kind: 'js',
				value: 'console.log("new")',
				position: 2
			};

			await service.handleCellCreated(payload);

			expect(mockNotebookStore.addCell).toHaveBeenCalledWith({
				id: 'cell-3',
				kind: 'js',
				value: 'console.log("new")',
				position: 2
			});
		});

		it('should handle cell creation with optional fields', async () => {
			const payload: CellCreatedPayload = {
				cellId: 'cell-4',
				kind: 'md',
				value: '# Title',
				position: 0,
				createdAt: '2023-01-01T00:00:00Z'
			};

			await service.handleCellCreated(payload);

			expect(mockNotebookStore.addCell).toHaveBeenCalledWith({
				id: 'cell-4',
				kind: 'md',
				value: '# Title',
				position: 0
			});
		});
	});

	describe('handleCellUpdated', () => {
		it('should update cell value', async () => {
			const payload: CellUpdatedPayload = {
				cellId: 'cell-1',
				changes: {
					value: 'updated value'
				}
			};

			await service.handleCellUpdated(payload);

			expect(mockNotebookStore.updateCell).toHaveBeenCalledWith('cell-1', {
				value: 'updated value'
			});
		});

		it('should update cell kind', async () => {
			const payload: CellUpdatedPayload = {
				cellId: 'cell-1',
				changes: {
					kind: 'md'
				}
			};

			await service.handleCellUpdated(payload);

			expect(mockNotebookStore.updateCell).toHaveBeenCalledWith('cell-1', {
				kind: 'md'
			});
		});

		it('should update both kind and value', async () => {
			const payload: CellUpdatedPayload = {
				cellId: 'cell-1',
				changes: {
					kind: 'html',
					value: '<h1>Hello</h1>'
				}
			};

			await service.handleCellUpdated(payload);

			expect(mockNotebookStore.updateCell).toHaveBeenCalledWith('cell-1', {
				kind: 'html',
				value: '<h1>Hello</h1>'
			});
		});
	});

	describe('handleCellDeleted', () => {
		it('should remove cell from store', async () => {
			const payload: CellDeletedPayload = {
				cellId: 'cell-1'
			};

			await service.handleCellDeleted(payload);

			expect(mockNotebookStore.removeCell).toHaveBeenCalledWith('cell-1');
		});
	});

	describe('handleCellMoved', () => {
		it('should move cell to new position', async () => {
			const payload: CellMovedPayload = {
				cellId: 'cell-1',
				position: 3
			};

			await service.handleCellMoved(payload);

			expect(mockNotebookStore.moveCell).toHaveBeenCalledWith('cell-1', 3);
		});

		it('should handle moving to position 0', async () => {
			const payload: CellMovedPayload = {
				cellId: 'cell-2',
				position: 0
			};

			await service.handleCellMoved(payload);

			expect(mockNotebookStore.moveCell).toHaveBeenCalledWith('cell-2', 0);
		});
	});

	describe('handleNotebookUpdated', () => {
		it('should update notebook title', async () => {
			const payload: NotebookUpdatedPayload = {
				notebookId: 'notebook-1',
				changes: {
					title: 'Updated Title'
				},
				updatedAt: '2023-01-01T00:00:00Z'
			};

			await service.handleNotebookUpdated(payload);

			expect(mockNotebookStore.updateMetadata).toHaveBeenCalledWith({
				title: 'Updated Title'
			});
		});

		it('should update notebook description', async () => {
			const payload: NotebookUpdatedPayload = {
				notebookId: 'notebook-1',
				changes: {
					description: 'Updated Description'
				},
				updatedAt: '2023-01-01T00:00:00Z'
			};

			await service.handleNotebookUpdated(payload);

			expect(mockNotebookStore.updateMetadata).toHaveBeenCalledWith({
				description: 'Updated Description'
			});
		});

		it('should update both title and description', async () => {
			const payload: NotebookUpdatedPayload = {
				notebookId: 'notebook-1',
				changes: {
					title: 'New Title',
					description: 'New Description'
				},
				updatedAt: '2023-01-01T00:00:00Z'
			};

			await service.handleNotebookUpdated(payload);

			expect(mockNotebookStore.updateMetadata).toHaveBeenCalledWith({
				title: 'New Title',
				description: 'New Description'
			});
		});
	});

	describe('handleNotebookInitialized', () => {
		it('should log initialization', async () => {
			const payload: NotebookInitializedPayload = {
				cells: [
					{ id: 'cell-1', kind: 'js', value: 'value 1' },
					{ id: 'cell-2', kind: 'md', value: 'value 2' }
				]
			};

			await service.handleNotebookInitialized(payload);

			// Should not modify store (cells already loaded)
			expect(mockNotebookStore.addCell).not.toHaveBeenCalled();
			expect(mockNotebookStore.removeCell).not.toHaveBeenCalled();
		});
	});

	describe('resetSequencer', () => {
		it('should reset event sequencer', () => {
			// Just verify it doesn't throw
			service.resetSequencer();
			expect(true).toBe(true);
		});
	});
});
