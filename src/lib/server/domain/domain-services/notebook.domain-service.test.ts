import { describe, it, expect, beforeEach } from 'vitest';
import { NotebookServiceImpl } from './notebook.service.impl';
import type { CellKind } from '$lib/server/domain/value-objects';

describe('NotebookDomainService', () => {
	let notebookService: NotebookServiceImpl;

	beforeEach(() => {
		notebookService = new NotebookServiceImpl('test-notebook');
	});

	describe('Basic Properties', () => {
		it('should have correct id', () => {
			expect(notebookService.id).toBe('test-notebook');
		});

		it('should start with empty cells', () => {
			expect(notebookService.cells).toEqual([]);
		});

		it('should start with null lastEventId', () => {
			expect(notebookService.lastEventId).toBeNull();
		});
	});

	describe('Event Creation', () => {
		it('should create welcome cell event', () => {
			const event = notebookService.createWelcomeCellEvent();

			expect(event.type).toBe('cell.created');
			expect(event.payload.kind).toBe('md');
			expect(event.payload.value).toContain('Welcome to Your Notebook');
			expect(event.payload.position).toBe(0);
			expect(event.payload.createdAt).toBeDefined();
		});

		it('should create cell event with correct properties', () => {
			const event = notebookService.createCellEvent('js', 'console.log("test");', 0);

			expect(event.type).toBe('cell.created');
			expect(event.payload.kind).toBe('js');
			expect(event.payload.value).toBe('console.log("test");');
			expect(event.payload.position).toBe(0);
			expect(event.payload.createdAt).toBeDefined();
			expect(event.payload.cellId).toBeDefined();
		});

		it('should create delete cell event', () => {
			// First add a cell to the internal state
			notebookService.eventHandler({
				id: 'test-event-1',
				type: 'cell.created',
				payload: {
					cellId: 'test-cell-1',
					kind: 'js',
					value: 'test',
					position: 0,
					createdAt: new Date().toISOString()
				}
			});

			const event = notebookService.createDeleteCellEvent('test-cell-1');

			expect(event.type).toBe('cell.deleted');
			expect(event.payload.cellId).toBe('test-cell-1');
			expect(event.payload.deletedAt).toBeDefined();
		});

		it('should create update cell event', () => {
			// First add a cell to the internal state
			notebookService.eventHandler({
				id: 'test-event-1',
				type: 'cell.created',
				payload: {
					cellId: 'test-cell-1',
					kind: 'js',
					value: 'test',
					position: 0,
					createdAt: new Date().toISOString()
				}
			});

			const event = notebookService.createUpdateCellEvent('test-cell-1', { value: 'updated' });

			expect(event.type).toBe('cell.updated');
			expect(event.payload.cellId).toBe('test-cell-1');
			expect(event.payload.changes.value).toBe('updated');
			expect(event.payload.updatedAt).toBeDefined();
		});

		it('should create move cell event', () => {
			// First add a cell to the internal state
			notebookService.eventHandler({
				id: 'test-event-1',
				type: 'cell.created',
				payload: {
					cellId: 'test-cell-1',
					kind: 'js',
					value: 'test',
					position: 0,
					createdAt: new Date().toISOString()
				}
			});

			const event = notebookService.createMoveCellEvent('test-cell-1', 1);

			expect(event.type).toBe('cell.moved');
			expect(event.payload.cellId).toBe('test-cell-1');
			expect(event.payload.position).toBe(1);
			expect(event.payload.movedAt).toBeDefined();
		});
	});

	describe('Event Validation', () => {
		it('should throw error for invalid cell kind', () => {
			expect(() => {
				notebookService.createCellEvent('invalid' as CellKind, 'test', 0);
			}).toThrow('Invalid cell kind');
		});

		it('should throw error for negative position', () => {
			expect(() => {
				notebookService.createCellEvent('js', 'test', -1);
			}).toThrow('Invalid position');
		});

		it('should throw error for position beyond array length', () => {
			expect(() => {
				notebookService.createCellEvent('js', 'test', 100);
			}).toThrow('Invalid position');
		});

		it('should throw error for empty value', () => {
			expect(() => {
				notebookService.createCellEvent('js', '', 0);
			}).toThrow('kind, value, and position are required');
		});

		it('should throw error for non-existent cell ID in delete', () => {
			expect(() => {
				notebookService.createDeleteCellEvent('non-existent');
			}).toThrow('Cell not found');
		});

		it('should throw error for non-existent cell ID in update', () => {
			expect(() => {
				notebookService.createUpdateCellEvent('non-existent', { value: 'test' });
			}).toThrow('Cell not found');
		});

		it('should throw error for non-existent cell ID in move', () => {
			expect(() => {
				notebookService.createMoveCellEvent('non-existent', 1);
			}).toThrow('Cell not found');
		});
	});

	describe('Event Handling', () => {
		it('should handle cell created event', () => {
			const event = {
				id: 'test-event-1',
				type: 'cell.created' as const,
				payload: {
					cellId: 'test-cell-1',
					kind: 'js' as CellKind,
					value: 'console.log("test");',
					position: 0,
					createdAt: new Date().toISOString()
				}
			};

			notebookService.eventHandler(event);

			expect(notebookService.cells).toHaveLength(1);
			expect(notebookService.cells[0].id).toBe('test-cell-1');
			expect(notebookService.cells[0].kind).toBe('js');
			expect(notebookService.cells[0].value).toBe('console.log("test");');
			expect(notebookService.lastEventId).toBe('test-event-1');
		});

		it('should handle cell updated event', () => {
			// First create a cell
			notebookService.eventHandler({
				id: 'test-event-1',
				type: 'cell.created',
				payload: {
					cellId: 'test-cell-1',
					kind: 'js',
					value: 'original',
					position: 0,
					createdAt: new Date().toISOString()
				}
			});

			// Then update it
			const updateEvent = {
				id: 'test-event-2',
				type: 'cell.updated' as const,
				payload: {
					cellId: 'test-cell-1',
					changes: { value: 'updated' },
					updatedAt: new Date().toISOString()
				}
			};

			notebookService.eventHandler(updateEvent);

			expect(notebookService.cells[0].value).toBe('updated');
			expect(notebookService.lastEventId).toBe('test-event-2');
		});

		it('should handle cell deleted event', () => {
			// First create a cell
			notebookService.eventHandler({
				id: 'test-event-1',
				type: 'cell.created',
				payload: {
					cellId: 'test-cell-1',
					kind: 'js',
					value: 'test',
					position: 0,
					createdAt: new Date().toISOString()
				}
			});

			expect(notebookService.cells).toHaveLength(1);

			// Then delete it
			const deleteEvent = {
				id: 'test-event-2',
				type: 'cell.deleted' as const,
				payload: {
					cellId: 'test-cell-1',
					deletedAt: new Date().toISOString()
				}
			};

			notebookService.eventHandler(deleteEvent);

			expect(notebookService.cells).toHaveLength(0);
			expect(notebookService.lastEventId).toBe('test-event-2');
		});

		it('should handle cell moved event', () => {
			// First create two cells
			notebookService.eventHandler({
				id: 'test-event-1',
				type: 'cell.created',
				payload: {
					cellId: 'test-cell-1',
					kind: 'js',
					value: 'first',
					position: 0,
					createdAt: new Date().toISOString()
				}
			});

			notebookService.eventHandler({
				id: 'test-event-2',
				type: 'cell.created',
				payload: {
					cellId: 'test-cell-2',
					kind: 'js',
					value: 'second',
					position: 1,
					createdAt: new Date().toISOString()
				}
			});

			expect(notebookService.cells[0].id).toBe('test-cell-1');
			expect(notebookService.cells[1].id).toBe('test-cell-2');

			// Move first cell to position 1
			const moveEvent = {
				id: 'test-event-3',
				type: 'cell.moved' as const,
				payload: {
					cellId: 'test-cell-1',
					position: 1,
					movedAt: new Date().toISOString()
				}
			};

			notebookService.eventHandler(moveEvent);

			expect(notebookService.cells[0].id).toBe('test-cell-2');
			expect(notebookService.cells[1].id).toBe('test-cell-1');
			expect(notebookService.lastEventId).toBe('test-event-3');
		});
	});
});
