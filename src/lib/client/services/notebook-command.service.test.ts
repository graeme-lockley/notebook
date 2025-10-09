import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotebookCommandService } from './notebook-command.service';
import type { NotebookStore } from '$lib/client/stores/notebook';

// Mock the server commands
vi.mock('$lib/client/server/server-commands', () => ({
	addCell: vi.fn(),
	updateCell: vi.fn(),
	deleteCell: vi.fn(),
	moveCell: vi.fn(),
	duplicateCell: vi.fn()
}));

// Mock the logger
vi.mock('$lib/common/infrastructure/logging/logger.service', () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		configure: vi.fn()
	}
}));

import * as ServerCommand from '$lib/client/server/server-commands';

describe('NotebookCommandService', () => {
	let service: NotebookCommandService;
	let mockNotebookStore: NotebookStore;

	beforeEach(() => {
		// Create a mock notebook store
		mockNotebookStore = {
			findCellIndex: vi.fn(),
			length: vi.fn().mockReturnValue(5)
		} as unknown as NotebookStore;

		service = new NotebookCommandService('notebook-1', mockNotebookStore);
		vi.clearAllMocks();
	});

	describe('addCell', () => {
		it('should call server command to add cell', async () => {
			await service.addCell('js', 'console.log("test")', 0);

			expect(ServerCommand.addCell).toHaveBeenCalledWith(
				'notebook-1',
				'js',
				'console.log("test")',
				0
			);
		});

		it('should add markdown cell', async () => {
			await service.addCell('md', '# Title', 2);

			expect(ServerCommand.addCell).toHaveBeenCalledWith('notebook-1', 'md', '# Title', 2);
		});

		it('should add html cell', async () => {
			await service.addCell('html', '<h1>Hello</h1>', 1);

			expect(ServerCommand.addCell).toHaveBeenCalledWith('notebook-1', 'html', '<h1>Hello</h1>', 1);
		});
	});

	describe('updateCell', () => {
		it('should update cell value', async () => {
			await service.updateCell('cell-1', { value: 'new value' });

			expect(ServerCommand.updateCell).toHaveBeenCalledWith('notebook-1', 'cell-1', {
				value: 'new value'
			});
		});

		it('should update cell kind', async () => {
			await service.updateCell('cell-1', { kind: 'md' });

			expect(ServerCommand.updateCell).toHaveBeenCalledWith('notebook-1', 'cell-1', {
				kind: 'md'
			});
		});

		it('should update both kind and value', async () => {
			await service.updateCell('cell-1', { kind: 'html', value: '<p>Text</p>' });

			expect(ServerCommand.updateCell).toHaveBeenCalledWith('notebook-1', 'cell-1', {
				kind: 'html',
				value: '<p>Text</p>'
			});
		});
	});

	describe('deleteCell', () => {
		it('should delete cell', async () => {
			await service.deleteCell('cell-1');

			expect(ServerCommand.deleteCell).toHaveBeenCalledWith('notebook-1', 'cell-1');
		});
	});

	describe('moveCell', () => {
		it('should move cell up', async () => {
			vi.mocked(mockNotebookStore.findCellIndex).mockReturnValue(2);

			await service.moveCell('cell-1', 'up');

			expect(ServerCommand.moveCell).toHaveBeenCalledWith('notebook-1', 'cell-1', 1);
		});

		it('should move cell down', async () => {
			vi.mocked(mockNotebookStore.findCellIndex).mockReturnValue(2);

			await service.moveCell('cell-1', 'down');

			expect(ServerCommand.moveCell).toHaveBeenCalledWith('notebook-1', 'cell-1', 3);
		});

		it('should not move cell up from first position', async () => {
			vi.mocked(mockNotebookStore.findCellIndex).mockReturnValue(0);

			await service.moveCell('cell-1', 'up');

			expect(ServerCommand.moveCell).not.toHaveBeenCalled();
		});

		it('should not move cell down from last position', async () => {
			vi.mocked(mockNotebookStore.findCellIndex).mockReturnValue(4);
			vi.mocked(mockNotebookStore.length).mockReturnValue(5);

			await service.moveCell('cell-1', 'down');

			expect(ServerCommand.moveCell).not.toHaveBeenCalled();
		});

		it('should handle cell not found', async () => {
			vi.mocked(mockNotebookStore.findCellIndex).mockReturnValue(-1);

			await service.moveCell('nonexistent', 'up');

			expect(ServerCommand.moveCell).not.toHaveBeenCalled();
		});

		it('should calculate correct position for middle cell moving up', async () => {
			vi.mocked(mockNotebookStore.findCellIndex).mockReturnValue(3);

			await service.moveCell('cell-1', 'up');

			expect(ServerCommand.moveCell).toHaveBeenCalledWith('notebook-1', 'cell-1', 2);
		});

		it('should calculate correct position for middle cell moving down', async () => {
			vi.mocked(mockNotebookStore.findCellIndex).mockReturnValue(1);

			await service.moveCell('cell-1', 'down');

			expect(ServerCommand.moveCell).toHaveBeenCalledWith('notebook-1', 'cell-1', 2);
		});
	});

	describe('duplicateCell', () => {
		it('should duplicate cell', async () => {
			await service.duplicateCell('cell-1');

			expect(ServerCommand.duplicateCell).toHaveBeenCalledWith('notebook-1', 'cell-1');
		});
	});

	describe('position calculation', () => {
		it('should respect notebook boundaries', async () => {
			vi.mocked(mockNotebookStore.length).mockReturnValue(3);

			// First cell can't move up
			vi.mocked(mockNotebookStore.findCellIndex).mockReturnValue(0);
			await service.moveCell('cell-1', 'up');
			expect(ServerCommand.moveCell).not.toHaveBeenCalled();

			// Last cell can't move down
			vi.mocked(mockNotebookStore.findCellIndex).mockReturnValue(2);
			await service.moveCell('cell-2', 'down');
			expect(ServerCommand.moveCell).not.toHaveBeenCalled();
		});

		it('should handle single cell notebook', async () => {
			vi.mocked(mockNotebookStore.length).mockReturnValue(1);
			vi.mocked(mockNotebookStore.findCellIndex).mockReturnValue(0);

			await service.moveCell('cell-1', 'up');
			expect(ServerCommand.moveCell).not.toHaveBeenCalled();

			await service.moveCell('cell-1', 'down');
			expect(ServerCommand.moveCell).not.toHaveBeenCalled();
		});
	});

	describe('error handling', () => {
		it('should handle server command errors gracefully', async () => {
			vi.mocked(ServerCommand.addCell).mockRejectedValue(new Error('Network error'));

			await expect(service.addCell('js', 'test', 0)).rejects.toThrow('Network error');
		});
	});
});
