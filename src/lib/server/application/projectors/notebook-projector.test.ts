import { describe, it, expect, beforeEach } from 'vitest';
import { NotebookProjector } from './notebook-projector';
import { PerNotebookReadModel } from '../adapters/inbound/per-notebook-read-model';
import type { DomainEvent } from '../ports/outbound/event-bus';

describe('NotebookProjector', () => {
	let projector: NotebookProjector;
	let readModel: PerNotebookReadModel;
	const testNotebookId = 'test-notebook-123';

	beforeEach(() => {
		readModel = new PerNotebookReadModel(testNotebookId);
		projector = new NotebookProjector(readModel, testNotebookId);
	});

	describe('handleCellCreated', () => {
		it('should add cell at correct position when position is provided', async () => {
			const event: DomainEvent = {
				id: 'event-1',
				type: 'cell.created',
				payload: {
					cellId: 'cell-1',
					kind: 'js',
					value: 'console.log("test");',
					position: 1,
					createdAt: '2025-01-01T00:00:00Z'
				},
				timestamp: new Date('2025-01-01T00:00:00Z'),
				aggregateId: testNotebookId
			};

			// Add a cell first to test insertion in middle
			readModel.addCellAtPosition(
				testNotebookId,
				{
					id: 'existing-cell',
					kind: 'md',
					value: '# Existing',
					createdAt: new Date(),
					updatedAt: new Date()
				},
				0
			);

			await projector.handle(event);

			const cells = await readModel.getCells(testNotebookId);
			expect(cells).toHaveLength(2);
			expect(cells[0].id).toBe('existing-cell');
			expect(cells[1].id).toBe('cell-1'); // Should be at position 1
		});

		it('should add cell at position 0 when position is 0', async () => {
			const event: DomainEvent = {
				id: 'event-1',
				type: 'cell.created',
				payload: {
					cellId: 'cell-1',
					kind: 'js',
					value: 'console.log("test");',
					position: 0,
					createdAt: '2025-01-01T00:00:00Z'
				},
				timestamp: new Date('2025-01-01T00:00:00Z'),
				aggregateId: testNotebookId
			};

			// Add a cell first
			readModel.addCellAtPosition(
				testNotebookId,
				{
					id: 'existing-cell',
					kind: 'md',
					value: '# Existing',
					createdAt: new Date(),
					updatedAt: new Date()
				},
				0
			);

			await projector.handle(event);

			const cells = await readModel.getCells(testNotebookId);
			expect(cells).toHaveLength(2);
			expect(cells[0].id).toBe('cell-1'); // Should be at position 0
			expect(cells[1].id).toBe('existing-cell');
		});

		it('should handle cell creation in empty notebook', async () => {
			const event: DomainEvent = {
				id: 'event-1',
				type: 'cell.created',
				payload: {
					cellId: 'cell-1',
					kind: 'js',
					value: 'console.log("test");',
					position: 0,
					createdAt: '2025-01-01T00:00:00Z'
				},
				timestamp: new Date('2025-01-01T00:00:00Z'),
				aggregateId: testNotebookId
			};

			await projector.handle(event);

			const cells = await readModel.getCells(testNotebookId);
			expect(cells).toHaveLength(1);
			expect(cells[0].id).toBe('cell-1');
		});

		it('should create cell with correct properties', async () => {
			const event: DomainEvent = {
				id: 'event-1',
				type: 'cell.created',
				payload: {
					cellId: 'cell-1',
					kind: 'html',
					value: '<div>Test</div>',
					position: 0,
					createdAt: '2025-01-01T00:00:00Z'
				},
				timestamp: new Date('2025-01-01T00:00:00Z'),
				aggregateId: testNotebookId
			};

			await projector.handle(event);

			const cells = await readModel.getCells(testNotebookId);
			expect(cells[0]).toEqual({
				id: 'cell-1',
				kind: 'html',
				value: '<div>Test</div>',
				createdAt: new Date('2025-01-01T00:00:00Z'),
				updatedAt: new Date('2025-01-01T00:00:00Z')
			});
		});
	});

	describe('handleCellUpdated', () => {
		it('should update cell content while preserving position', async () => {
			// First create a cell
			const createEvent: DomainEvent = {
				id: 'event-1',
				type: 'cell.created',
				payload: {
					cellId: 'cell-1',
					kind: 'js',
					value: 'console.log("original");',
					position: 0,
					createdAt: '2025-01-01T00:00:00Z'
				},
				timestamp: new Date('2025-01-01T00:00:00Z'),
				aggregateId: testNotebookId
			};
			await projector.handle(createEvent);

			// Then update it
			const updateEvent: DomainEvent = {
				id: 'event-2',
				type: 'cell.updated',
				payload: {
					cellId: 'cell-1',
					changes: {
						value: 'console.log("updated");'
					},
					updatedAt: '2025-01-01T00:01:00Z'
				},
				timestamp: new Date('2025-01-01T00:01:00Z'),
				aggregateId: testNotebookId
			};
			await projector.handle(updateEvent);

			const cells = await readModel.getCells(testNotebookId);
			expect(cells).toHaveLength(1);
			expect(cells[0].value).toBe('console.log("updated");');
		});
	});

	describe('handleCellDeleted', () => {
		it('should remove cell while preserving order of remaining cells', async () => {
			// Create multiple cells
			const createEvent1: DomainEvent = {
				id: 'event-1',
				type: 'cell.created',
				payload: {
					cellId: 'cell-1',
					kind: 'js',
					value: 'console.log("first");',
					position: 0,
					createdAt: '2025-01-01T00:00:00Z'
				},
				timestamp: new Date('2025-01-01T00:00:00Z'),
				aggregateId: testNotebookId
			};
			await projector.handle(createEvent1);

			const createEvent2: DomainEvent = {
				id: 'event-2',
				type: 'cell.created',
				payload: {
					cellId: 'cell-2',
					kind: 'md',
					value: '# Second',
					position: 1,
					createdAt: '2025-01-01T00:01:00Z'
				},
				timestamp: new Date('2025-01-01T00:01:00Z'),
				aggregateId: testNotebookId
			};
			await projector.handle(createEvent2);

			// Delete the first cell
			const deleteEvent: DomainEvent = {
				id: 'event-3',
				type: 'cell.deleted',
				payload: {
					cellId: 'cell-1',
					deletedAt: '2025-01-01T00:02:00Z'
				},
				timestamp: new Date('2025-01-01T00:02:00Z'),
				aggregateId: testNotebookId
			};
			await projector.handle(deleteEvent);

			const cells = await readModel.getCells(testNotebookId);
			expect(cells).toHaveLength(1);
			expect(cells[0].id).toBe('cell-2');
		});
	});

	describe('handleCellMoved', () => {
		it('should move cell to new position', async () => {
			// Create multiple cells
			const createEvent1: DomainEvent = {
				id: 'event-1',
				type: 'cell.created',
				payload: {
					cellId: 'cell-1',
					kind: 'js',
					value: 'console.log("first");',
					position: 0,
					createdAt: '2025-01-01T00:00:00Z'
				},
				timestamp: new Date('2025-01-01T00:00:00Z'),
				aggregateId: testNotebookId
			};
			await projector.handle(createEvent1);

			const createEvent2: DomainEvent = {
				id: 'event-2',
				type: 'cell.created',
				payload: {
					cellId: 'cell-2',
					kind: 'md',
					value: '# Second',
					position: 1,
					createdAt: '2025-01-01T00:01:00Z'
				},
				timestamp: new Date('2025-01-01T00:01:00Z'),
				aggregateId: testNotebookId
			};
			await projector.handle(createEvent2);

			// Move cell-1 to position 1 (after cell-2)
			const moveEvent: DomainEvent = {
				id: 'event-3',
				type: 'cell.moved',
				payload: {
					cellId: 'cell-1',
					position: 1,
					movedAt: '2025-01-01T00:02:00Z'
				},
				timestamp: new Date('2025-01-01T00:02:00Z'),
				aggregateId: testNotebookId
			};
			await projector.handle(moveEvent);

			const cells = await readModel.getCells(testNotebookId);
			expect(cells).toHaveLength(2);
			expect(cells[0].id).toBe('cell-2'); // Should be first now
			expect(cells[1].id).toBe('cell-1'); // Should be second now
		});
	});

	describe('event handling', () => {
		it('should ignore unknown event types', async () => {
			const event: DomainEvent = {
				id: 'event-1',
				type: 'unknown.event',
				payload: {},
				timestamp: new Date(),
				aggregateId: testNotebookId
			};

			// Should not throw
			await expect(projector.handle(event)).resolves.toBeUndefined();

			const cells = await readModel.getCells(testNotebookId);
			expect(cells).toHaveLength(0);
		});
	});
});
