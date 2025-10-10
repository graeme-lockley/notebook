import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DuplicateCellCommandHandler } from './duplicate-cell-command-handler';
import type { EventStore } from '../ports/outbound/event-store';
import type { EventBus } from '../ports/outbound/event-bus';
import type { NotebookProjectionManager } from '../services/notebook-projection-manager';
import type { CellReadModel } from '../ports/inbound/read-models';
import type { Cell } from '$lib/server/domain/value-objects';

describe('DuplicateCellCommandHandler', () => {
	let handler: DuplicateCellCommandHandler;
	let mockEventStore: EventStore;
	let mockProjectionManager: NotebookProjectionManager;
	let mockEventBus: EventBus;
	let mockReadModel: CellReadModel;

	beforeEach(() => {
		// Mock read model
		mockReadModel = {
			getCells: vi.fn(),
			getCell: vi.fn()
		} as unknown as CellReadModel;

		// Mock projection manager
		mockProjectionManager = {
			acquireProjection: vi.fn(),
			releaseProjection: vi.fn(),
			getProjectionReadModel: vi.fn().mockResolvedValue(mockReadModel)
		} as unknown as NotebookProjectionManager;

		// Mock event store
		mockEventStore = {
			publishEvent: vi.fn().mockResolvedValue('event-123')
		} as unknown as EventStore;

		// Mock event bus
		mockEventBus = {
			publish: vi.fn()
		} as unknown as EventBus;

		handler = new DuplicateCellCommandHandler(mockEventStore, mockProjectionManager, mockEventBus);
	});

	it('should duplicate cell successfully', async () => {
		const sourceCellId = 'cell-1';
		const notebookId = 'notebook-1';
		const mockCells: Cell[] = [
			{
				id: sourceCellId,
				kind: 'js',
				value: 'console.log("test")',
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				id: 'cell-2',
				kind: 'md',
				value: '# Title',
				createdAt: new Date(),
				updatedAt: new Date()
			}
		];

		vi.mocked(mockReadModel.getCells).mockResolvedValue(mockCells);

		const result = await handler.handle({
			notebookId,
			cellId: sourceCellId
		});

		// Verify projection was acquired and released
		expect(mockProjectionManager.acquireProjection).toHaveBeenCalledWith(notebookId);
		expect(mockProjectionManager.releaseProjection).toHaveBeenCalledWith(notebookId);

		// Verify event was published
		expect(mockEventStore.publishEvent).toHaveBeenCalledWith(
			notebookId,
			'cell.created',
			expect.objectContaining({
				kind: 'js',
				value: 'console.log("test")',
				position: 1 // Right after the source cell at position 0
			})
		);

		// Verify event bus was notified
		expect(mockEventBus.publish).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'event-123',
				type: 'cell.created',
				aggregateId: notebookId
			})
		);

		// Verify result
		expect(result.cellId).toBeDefined();
		expect(result.eventId).toBe('event-123');
	});

	it('should throw error if source cell not found', async () => {
		const notebookId = 'notebook-1';
		const mockCells: Cell[] = [
			{
				id: 'cell-1',
				kind: 'js',
				value: 'console.log("test")',
				createdAt: new Date(),
				updatedAt: new Date()
			}
		];

		vi.mocked(mockReadModel.getCells).mockResolvedValue(mockCells);

		await expect(
			handler.handle({
				notebookId,
				cellId: 'non-existent-cell'
			})
		).rejects.toThrow('Cell not found: non-existent-cell');

		// Verify projection was still released
		expect(mockProjectionManager.releaseProjection).toHaveBeenCalledWith(notebookId);
	});

	it('should create cell at correct position after source cell', async () => {
		const sourceCellId = 'cell-2';
		const notebookId = 'notebook-1';
		const mockCells: Cell[] = [
			{
				id: 'cell-1',
				kind: 'js',
				value: 'first',
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				id: sourceCellId,
				kind: 'md',
				value: 'second',
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				id: 'cell-3',
				kind: 'html',
				value: 'third',
				createdAt: new Date(),
				updatedAt: new Date()
			}
		];

		vi.mocked(mockReadModel.getCells).mockResolvedValue(mockCells);

		await handler.handle({
			notebookId,
			cellId: sourceCellId
		});

		// Verify event was published with correct position
		expect(mockEventStore.publishEvent).toHaveBeenCalledWith(
			notebookId,
			'cell.created',
			expect.objectContaining({
				position: 2 // Right after source cell at index 1
			})
		);
	});

	it('should preserve source cell kind and value', async () => {
		const sourceCellId = 'cell-1';
		const notebookId = 'notebook-1';
		const mockCells: Cell[] = [
			{
				id: sourceCellId,
				kind: 'html',
				value: '<div>Hello World</div>',
				createdAt: new Date(),
				updatedAt: new Date()
			}
		];

		vi.mocked(mockReadModel.getCells).mockResolvedValue(mockCells);

		await handler.handle({
			notebookId,
			cellId: sourceCellId
		});

		// Verify event was published with source cell's data
		expect(mockEventStore.publishEvent).toHaveBeenCalledWith(
			notebookId,
			'cell.created',
			expect.objectContaining({
				kind: 'html',
				value: '<div>Hello World</div>'
			})
		);
	});

	it('should generate unique cellId', async () => {
		const sourceCellId = 'cell-1';
		const notebookId = 'notebook-1';
		const mockCells: Cell[] = [
			{
				id: sourceCellId,
				kind: 'js',
				value: 'test',
				createdAt: new Date(),
				updatedAt: new Date()
			}
		];

		vi.mocked(mockReadModel.getCells).mockResolvedValue(mockCells);

		const result = await handler.handle({
			notebookId,
			cellId: sourceCellId
		});

		// Verify new cell has different ID
		expect(result.cellId).not.toBe(sourceCellId);
		expect(result.cellId).toBeDefined();
	});

	it('should throw error if notebookId is missing', async () => {
		await expect(
			handler.handle({
				notebookId: '',
				cellId: 'cell-1'
			})
		).rejects.toThrow('Notebook ID is required');
	});

	it('should throw error if cellId is missing', async () => {
		await expect(
			handler.handle({
				notebookId: 'notebook-1',
				cellId: ''
			})
		).rejects.toThrow('Cell ID is required');
	});

	it('should release projection even if error occurs', async () => {
		const notebookId = 'notebook-1';

		vi.mocked(mockReadModel.getCells).mockRejectedValue(new Error('Database error'));

		await expect(
			handler.handle({
				notebookId,
				cellId: 'cell-1'
			})
		).rejects.toThrow();

		// Verify projection was still released
		expect(mockProjectionManager.releaseProjection).toHaveBeenCalledWith(notebookId);
	});
});
