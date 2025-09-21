import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventStoreTestImpl } from '$lib/server/adapters/outbound/event-store/inmemory/event-store';
import type { EventStore } from '$lib/server/application/ports/outbound/event-store';
import { logger, type LoggerConfig } from '$lib/server/infrastructure/logging/logger.service';
import type { CellKind } from '$lib/server/domain/value-objects';

import { NotebookServiceImpl } from './notebook.service.impl';

describe('NotebookServiceImpl', () => {
	let eventStorePort: EventStore;
	let notebookService: NotebookServiceImpl;
	let notebookId: string;
	let previousLoggerConfig: LoggerConfig;

	beforeEach(async () => {
		// Configure logger to be silent during tests and store previous config
		previousLoggerConfig = logger.configure({
			enableInfo: false,
			enableWarn: false,
			enableError: false,
			enableDebug: false
		});

		// Create a test EventStore implementation for isolated testing
		eventStorePort = new EventStoreTestImpl();

		// Generate a unique notebook ID for each test
		notebookId = `notebook-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

		notebookService = new NotebookServiceImpl(notebookId, eventStorePort);

		await notebookService.initializeNotebook();
	});

	afterEach(async () => {
		// Clean up test data
		if (eventStorePort instanceof EventStoreTestImpl) {
			eventStorePort.clear();
		}

		// Restore logger configuration to previous state
		logger.configure(previousLoggerConfig);
	});

	describe('Initialization', () => {
		it('should initialize NotebookService successfully', () => {
			expect(notebookService).toBeDefined();
			expect(notebookService.id).toBe(notebookId);
			expect(notebookService.eventStore).toBe(eventStorePort);
			expect(notebookService.lastEventId).toEqual(notebookId + '-1');
			expect(notebookService.cells.length).toEqual(1);

			expect(notebookService.topicName()).toBe(notebookId);
		});
	});

	describe('EventStore Integration', () => {
		it('should verify test store is working', async () => {
			const topics = await eventStorePort.getTopics();
			expect(topics).toHaveLength(1);
			expect(topics[0].name).toBe(notebookId);
		});

		it('should demonstrate dependency inversion principle', () => {
			expect(notebookService.eventStore).toBe(eventStorePort);
			expect(notebookService.eventStore).toBeInstanceOf(EventStoreTestImpl);
		});
	});

	describe('initializeNotebook', () => {
		describe('Happy Path', () => {
			it('should initialize new notebook with welcome cell', async () => {
				await notebookService.initializeNotebook();

				expect(notebookService.cells).toHaveLength(1);
				expect(notebookService.cells[0].kind).toBe('md');
				expect(notebookService.cells[0].value).toContain('Welcome');
				expect(notebookService.lastEventId).toBeTruthy();
			});

			it('should create welcome cell with correct structure', async () => {
				await notebookService.initializeNotebook();

				const welcomeCell = notebookService.cells[0];
				expect(welcomeCell.id).toBeTruthy();
				expect(welcomeCell.kind).toBe('md');
				expect(welcomeCell.value).toContain('Welcome to Your Notebook');
				expect(welcomeCell.createdAt).toBeInstanceOf(Date);
				expect(welcomeCell.updatedAt).toBeInstanceOf(Date);
			});

			it('should handle existing notebook gracefully', async () => {
				// First initialization
				await notebookService.initializeNotebook();
				const firstCellCount = notebookService.cells.length;

				// Second initialization should not add another welcome cell
				await notebookService.initializeNotebook();
				expect(notebookService.cells).toHaveLength(firstCellCount);
			});
		});

		describe('Edge Cases', () => {
			it('should be idempotent - multiple calls should not cause issues', async () => {
				await notebookService.initializeNotebook();
				const initialCellCount = notebookService.cells.length;

				await notebookService.initializeNotebook();
				expect(notebookService.cells).toHaveLength(initialCellCount);
			});
		});
	});

	describe('addCell', () => {
		describe('Happy Path', () => {
			it('should add JavaScript cell at position 0', async () => {
				await notebookService.addCell('js', 'console.log("Hello World");', 0);
				await notebookService.hydrateNotebook();

				expect(notebookService.cells).toHaveLength(2);
				expect(notebookService.cells[0].kind).toBe('js');
				expect(notebookService.cells[0].value).toBe('console.log("Hello World");');
				expect(notebookService.lastEventId).toBeTruthy();
			});

			it('should add Markdown cell at position 0', async () => {
				await notebookService.addCell('md', '# Hello World', 0);
				await notebookService.hydrateNotebook();

				expect(notebookService.cells).toHaveLength(2);
				expect(notebookService.cells[0].kind).toBe('md');
				expect(notebookService.cells[0].value).toBe('# Hello World');
			});

			it('should add HTML cell at position 0', async () => {
				await notebookService.addCell('html', '<h1>Hello World</h1>', 0);
				await notebookService.hydrateNotebook();

				expect(notebookService.cells).toHaveLength(2);
				expect(notebookService.cells[0].kind).toBe('html');
				expect(notebookService.cells[0].value).toBe('<h1>Hello World</h1>');
			});

			it('should add cell at specific position', async () => {
				// Add first cell
				await notebookService.addCell('js', 'const a = 1;', 0);
				// Add second cell at position 1 (end of array)
				await notebookService.addCell('md', '# Second Cell', 1);
				await notebookService.hydrateNotebook();

				expect(notebookService.cells).toHaveLength(3);
				expect(notebookService.cells[0].value).toBe('const a = 1;');
				expect(notebookService.cells[1].value).toBe('# Second Cell');
			});

			it('should add cell at beginning when position is 0', async () => {
				await notebookService.addCell('js', 'const first = 1;', 0);
				await notebookService.addCell('js', 'const second = 2;', 0);
				await notebookService.hydrateNotebook();

				expect(notebookService.cells).toHaveLength(3);
				expect(notebookService.cells[0].value).toBe('const second = 2;');
				expect(notebookService.cells[1].value).toBe('const first = 1;');
			});
		});

		describe('Input Validation', () => {
			it('should throw error for invalid cell kind', async () => {
				await expect(
					notebookService.addCell('invalid' as CellKind, 'content', 0)
				).rejects.toThrow();
			});

			it('should throw error for negative position', async () => {
				await expect(notebookService.addCell('js', 'content', -1)).rejects.toThrow();
			});

			it('should throw error for position beyond array length', async () => {
				await expect(notebookService.addCell('js', 'content', 100)).rejects.toThrow();
			});

			it('should throw error for empty value', async () => {
				await expect(notebookService.addCell('js', '', 0)).rejects.toThrow();
			});

			it('should handle very long value', async () => {
				const longValue = 'a'.repeat(10000);
				await notebookService.addCell('js', longValue, 0);
				await notebookService.hydrateNotebook();

				expect(notebookService.cells).toHaveLength(2);
				expect(notebookService.cells[0].value).toBe(longValue);
			});
		});

		describe('Event Integration', () => {
			it('should publish cell.created event', async () => {
				await notebookService.addCell('js', 'console.log("test");', 0);

				const events = await eventStorePort.getEvents(notebookId);
				expect(events).toHaveLength(2);
				expect(events[0].type).toBe('cell.created');
			});

			it('should not return event ID (void method)', async () => {
				const result = await notebookService.addCell('js', 'test', 0);

				expect(result).toBeUndefined();
			});
		});
	});

	describe('deleteCell', () => {
		beforeEach(async () => {
			// Add a test cell to delete
			await notebookService.addCell('js', 'const test = 1;', 0);
			await notebookService.hydrateNotebook();
		});

		describe('Happy Path', () => {
			it('should delete existing cell', async () => {
				const cellId = notebookService.cells[0].id;
				await notebookService.deleteCell(cellId);
				await notebookService.hydrateNotebook();

				expect(notebookService.cells).toHaveLength(1);
			});

			it('should delete cell and maintain other cells', async () => {
				// Add second cell at position 1 (end of array)
				await notebookService.addCell('md', '# Second', 1);
				await notebookService.hydrateNotebook();
				const firstCellId = notebookService.cells[0].id;
				const secondCellId = notebookService.cells[1].id;

				await notebookService.deleteCell(firstCellId);
				await notebookService.hydrateNotebook();

				expect(notebookService.cells).toHaveLength(2);
				expect(notebookService.cells[0].id).toBe(secondCellId);
			});
		});

		describe('Not Found', () => {
			it('should throw error for non-existent cell ID', async () => {
				await expect(notebookService.deleteCell('non-existent-id')).rejects.toThrow();
			});

			it('should throw error for empty cell ID', async () => {
				await expect(notebookService.deleteCell('')).rejects.toThrow();
			});
		});

		describe('Input Validation', () => {
			it('should throw error for null cell ID', async () => {
				await expect(notebookService.deleteCell(null as unknown as string)).rejects.toThrow();
			});

			it('should throw error for undefined cell ID', async () => {
				await expect(notebookService.deleteCell(undefined as unknown as string)).rejects.toThrow();
			});
		});

		describe('Event Integration', () => {
			it('should publish cell.deleted event', async () => {
				const cellId = notebookService.cells[0].id;
				await notebookService.deleteCell(cellId);

				const events = await eventStorePort.getEvents(notebookId);
				expect(events).toHaveLength(3); // cell.created + cell.deleted
				expect(events[2].type).toBe('cell.deleted');
			});
		});
	});

	describe('updateCell', () => {
		beforeEach(async () => {
			// Add a test cell to update
			await notebookService.addCell('js', 'const original = 1;', 0);
			await notebookService.hydrateNotebook();
		});

		describe('Happy Path', () => {
			it('should update cell value', async () => {
				const cellId = notebookService.cells[0].id;
				await notebookService.updateCell(cellId, { value: 'const updated = 2;' });
				await notebookService.hydrateNotebook();

				expect(notebookService.cells[0].value).toBe('const updated = 2;');
			});

			it('should update cell kind', async () => {
				const cellId = notebookService.cells[0].id;
				await notebookService.updateCell(cellId, { kind: 'md' });
				await notebookService.hydrateNotebook();

				expect(notebookService.cells[0].kind).toBe('md');
			});

			it('should update both kind and value', async () => {
				const cellId = notebookService.cells[0].id;
				await notebookService.updateCell(cellId, {
					kind: 'html',
					value: '<h1>Updated</h1>'
				});
				await notebookService.hydrateNotebook();

				expect(notebookService.cells[0].kind).toBe('html');
				expect(notebookService.cells[0].value).toBe('<h1>Updated</h1>');
			});

			it('should update updatedAt timestamp', async () => {
				const cellId = notebookService.cells[0].id;
				const originalUpdatedAt = notebookService.cells[0].updatedAt;

				// Wait a small amount to ensure timestamp difference
				await new Promise((resolve) => setTimeout(resolve, 1));

				await notebookService.updateCell(cellId, { value: 'updated' });
				await notebookService.hydrateNotebook();

				expect(notebookService.cells[0].updatedAt.getTime()).toBeGreaterThan(
					originalUpdatedAt.getTime()
				);
			});
		});

		describe('Not Found', () => {
			it('should throw error for non-existent cell ID', async () => {
				await expect(
					notebookService.updateCell('non-existent-id', { value: 'test' })
				).rejects.toThrow();
			});
		});

		describe('Input Validation', () => {
			it('should handle empty updates object', async () => {
				const cellId = notebookService.cells[0].id;
				await expect(notebookService.updateCell(cellId, {})).rejects.toThrow();
			});

			it('should throw error for invalid cell kind', async () => {
				const cellId = notebookService.cells[0].id;
				await expect(
					notebookService.updateCell(cellId, { kind: 'invalid' as CellKind })
				).rejects.toThrow();
			});
		});

		describe('Event Integration', () => {
			it('should publish cell.updated event', async () => {
				const cellId = notebookService.cells[0].id;
				await notebookService.updateCell(cellId, { value: 'updated' });

				const events = await eventStorePort.getEvents(notebookId);
				expect(events).toHaveLength(3); // cell.created + cell.updated
				expect(events[2].type).toBe('cell.updated');
			});
		});
	});

	describe('moveCell', () => {
		beforeEach(async () => {
			// Add multiple test cells
			await notebookService.addCell('js', 'const first = 1;', 0);
			await notebookService.hydrateNotebook();
			await notebookService.addCell('js', 'const second = 2;', 1);
			await notebookService.hydrateNotebook();
			await notebookService.addCell('js', 'const third = 3;', 2);
			await notebookService.hydrateNotebook();
		});

		describe('Happy Path', () => {
			it('should move cell to different position', async () => {
				const cellId = notebookService.cells[0].id;
				await notebookService.moveCell(cellId, 2);
				await notebookService.hydrateNotebook();

				expect(notebookService.cells[2].id).toBe(cellId); // moved cell is now at position 2 (index 2)
				expect(notebookService.cells[0].value).toBe('const second = 2;'); // second cell is now at position 0
			});

			it('should move cell to beginning', async () => {
				const cellId = notebookService.cells[2].id;
				await notebookService.moveCell(cellId, 0);
				await notebookService.hydrateNotebook();

				expect(notebookService.cells[0].id).toBe(cellId);
			});

			it('should move cell to end', async () => {
				const cellId = notebookService.cells[0].id;
				await notebookService.moveCell(cellId, notebookService.cells.length);
				await notebookService.hydrateNotebook();

				expect(notebookService.cells[notebookService.cells.length - 1].id).toBe(cellId);
			});
		});

		describe('Not Found', () => {
			it('should throw error for non-existent cell ID', async () => {
				await expect(notebookService.moveCell('non-existent-id', 1)).rejects.toThrow();
			});
		});

		describe('Input Validation', () => {
			it('should throw error for negative position', async () => {
				const cellId = notebookService.cells[0].id;
				await expect(notebookService.moveCell(cellId, -1)).rejects.toThrow();
			});

			it('should throw error for position beyond array length', async () => {
				const cellId = notebookService.cells[0].id;
				await expect(notebookService.moveCell(cellId, 100)).rejects.toThrow();
			});
		});

		describe('Event Integration', () => {
			it('should publish cell.moved event', async () => {
				const cellId = notebookService.cells[0].id;
				await notebookService.moveCell(cellId, 2);

				const events = await eventStorePort.getEvents(notebookId);
				expect(events).toHaveLength(5); // 3 cell.created + 1 cell.moved
				expect(events[4].type).toBe('cell.moved');
			});
		});
	});

	describe('eventHandler', () => {
		describe('cell.created Events', () => {
			it('should process cell.created event correctly', async () => {
				// Publish the event through the event store to get proper sequential ID
				await eventStorePort.publishEvent(notebookId, 'cell.created', {
					cellId: 'cell-1',
					kind: 'js',
					value: 'console.log("test");',
					position: 0,
					createdAt: new Date().toISOString()
				});

				// Process the event to update the projection
				await notebookService.hydrateNotebook();

				expect(notebookService.cells).toHaveLength(2); // welcome cell + new cell
				expect(notebookService.cells[0].id).toBe('cell-1'); // new cell inserted at position 0
				expect(notebookService.cells[0].kind).toBe('js');
				expect(notebookService.cells[0].value).toBe('console.log("test");');
			});

			it('should handle cell.created event with different cell kinds', async () => {
				// Publish the event through the event store to get proper sequential ID
				await eventStorePort.publishEvent(notebookId, 'cell.created', {
					cellId: 'cell-1',
					kind: 'md',
					value: '# Hello',
					position: 0,
					createdAt: new Date().toISOString()
				});

				// Process the event to update the projection
				await notebookService.hydrateNotebook();

				expect(notebookService.cells[0].kind).toBe('md');
				expect(notebookService.cells[0].value).toBe('# Hello');
			});
		});

		describe('cell.updated Events', () => {
			beforeEach(async () => {
				// Add a cell first using the event store to get proper sequential ID
				await eventStorePort.publishEvent(notebookId, 'cell.created', {
					cellId: 'cell-1',
					kind: 'js',
					value: 'const original = 1;',
					position: 0,
					createdAt: new Date().toISOString()
				});

				// Process the event to update the projection
				await notebookService.hydrateNotebook();
			});

			it('should process cell.updated event correctly', async () => {
				// Publish the update event through the event store to get proper sequential ID
				await eventStorePort.publishEvent(notebookId, 'cell.updated', {
					cellId: 'cell-1',
					changes: { value: 'const updated = 2;' },
					updatedAt: new Date().toISOString()
				});

				// Process the event to update the projection
				await notebookService.hydrateNotebook();

				expect(notebookService.cells[0].value).toBe('const updated = 2;');
			});

			it('should handle partial updates', async () => {
				// Publish the update event through the event store to get proper sequential ID
				await eventStorePort.publishEvent(notebookId, 'cell.updated', {
					cellId: 'cell-1',
					changes: { kind: 'md' },
					updatedAt: new Date().toISOString()
				});

				// Process the event to update the projection
				await notebookService.hydrateNotebook();

				expect(notebookService.cells[0].kind).toBe('md');
				expect(notebookService.cells[0].value).toBe('const original = 1;'); // unchanged
			});
		});

		describe('cell.deleted Events', () => {
			beforeEach(async () => {
				// Add a cell first using the event store to get proper sequential IDs
				await eventStorePort.publishEvent(notebookId, 'cell.created', {
					cellId: 'cell-1',
					kind: 'js',
					value: 'const test = 1;',
					position: 0,
					createdAt: new Date().toISOString()
				});

				// Process the event to update the projection
				await notebookService.hydrateNotebook();
			});

			it('should process cell.deleted event correctly', async () => {
				// Publish the delete event through the event store to get proper sequential ID
				await eventStorePort.publishEvent(notebookId, 'cell.deleted', {
					cellId: 'cell-1',
					deletedAt: new Date().toISOString()
				});

				// Process the event to update the projection
				await notebookService.hydrateNotebook();

				expect(notebookService.cells).toHaveLength(1); // Only welcome cell remains
			});

			it('should handle deletion of non-existent cell gracefully', async () => {
				// Publish the delete event through the event store to get proper sequential ID
				await eventStorePort.publishEvent(notebookId, 'cell.deleted', {
					cellId: 'non-existent',
					deletedAt: new Date().toISOString()
				});

				// Process the event to update the projection
				await notebookService.hydrateNotebook();

				expect(notebookService.cells).toHaveLength(2); // Welcome cell + cell-1 still there
			});
		});

		describe('cell.moved Events', () => {
			beforeEach(async () => {
				// Add multiple cells using the addCell method to get proper cell IDs
				await notebookService.addCell('js', 'const first = 1;', 0);
				await notebookService.hydrateNotebook();
				await notebookService.addCell('js', 'const second = 2;', 1);
				await notebookService.hydrateNotebook();
			});

			it('should process cell.moved event correctly', async () => {
				// Get the ID of the first cell that was created in beforeEach
				const firstCellId = notebookService.cells[0].id;

				// Publish the move event through the event store to get proper sequential ID
				await eventStorePort.publishEvent(notebookId, 'cell.moved', {
					cellId: firstCellId,
					position: 1,
					movedAt: new Date().toISOString()
				});

				// Process the event to update the projection
				await notebookService.hydrateNotebook();

				expect(notebookService.cells[1].id).toBe(firstCellId); // first cell moved to position 1 (index 1)
				expect(notebookService.cells[0].value).toBe('const second = 2;'); // second cell is now at position 0 (index 0)
			});
		});

		describe('Event Deduplication', () => {
			it('should not process the same event twice', async () => {
				// Publish the event through the event store to get proper sequential ID
				await eventStorePort.publishEvent(notebookId, 'cell.created', {
					cellId: 'cell-1',
					kind: 'js',
					value: 'const test = 1;',
					position: 0,
					createdAt: new Date().toISOString()
				});

				// Process the event to update the projection
				await notebookService.hydrateNotebook();
				expect(notebookService.cells).toHaveLength(2); // Welcome cell + cell-1

				// Process same event again (this should be deduplicated)
				await notebookService.hydrateNotebook();
				expect(notebookService.cells).toHaveLength(2); // Should still be 2 (deduplication working)
			});

			it('should process events with different IDs', async () => {
				// Publish multiple events through the event store to get proper sequential IDs
				await eventStorePort.publishEvent(notebookId, 'cell.created', {
					cellId: 'cell-1',
					kind: 'js',
					value: 'const first = 1;',
					position: 0,
					createdAt: new Date().toISOString()
				});
				await eventStorePort.publishEvent(notebookId, 'cell.created', {
					cellId: 'cell-2',
					kind: 'js',
					value: 'const second = 2;',
					position: 1,
					createdAt: new Date().toISOString()
				});

				// Process the events to update the projection
				await notebookService.hydrateNotebook();

				expect(notebookService.cells).toHaveLength(3); // Welcome cell + cell-1 + cell-2
			});
		});

		describe('Unknown Event Types', () => {
			it('should handle unknown event types gracefully', async () => {
				// Publish an unknown event type through the event store
				await eventStorePort.publishEvent(notebookId, 'unknown.event' as 'cell.created', {
					some: 'data'
				});

				// Process the event - should handle gracefully without throwing
				await expect(notebookService.hydrateNotebook()).resolves.not.toThrow();
			});
		});
	});

	describe('hydrateNotebook', () => {
		describe('Event Processing', () => {
			it('should process events from event store and update cells', async () => {
				// Add events directly to event store
				await eventStorePort.publishEvent(notebookId, 'cell.created', {
					cellId: 'cell-1',
					kind: 'js',
					value: 'const test = 1;',
					position: 0,
					createdAt: new Date().toISOString()
				});

				await notebookService.hydrateNotebook();

				expect(notebookService.cells).toHaveLength(2); // welcome cell + cell-1
				expect(notebookService.cells[0].id).toBe('cell-1'); // cell-1 inserted at position 0
			});

			it('should process multiple events in correct order', async () => {
				// Add multiple events
				await eventStorePort.publishEvent(notebookId, 'cell.created', {
					cellId: 'cell-1',
					kind: 'js',
					value: 'const first = 1;',
					position: 0,
					createdAt: new Date().toISOString()
				});
				await eventStorePort.publishEvent(notebookId, 'cell.created', {
					cellId: 'cell-2',
					kind: 'md',
					value: '# Second',
					position: 1,
					createdAt: new Date().toISOString()
				});

				await notebookService.hydrateNotebook();

				expect(notebookService.cells).toHaveLength(3); // welcome cell + cell-1 + cell-2
				expect(notebookService.cells[0].id).toBe('cell-1'); // cell-1 inserted at position 0
				expect(notebookService.cells[1].id).toBe('cell-2'); // cell-2 inserted at position 1
			});

			it('should be idempotent - multiple calls should not cause issues', async () => {
				await eventStorePort.publishEvent(notebookId, 'cell.created', {
					cellId: 'cell-1',
					kind: 'js',
					value: 'const test = 1;',
					position: 0,
					createdAt: new Date().toISOString()
				});

				await notebookService.hydrateNotebook();
				const firstCellCount = notebookService.cells.length;

				await notebookService.hydrateNotebook();
				expect(notebookService.cells).toHaveLength(firstCellCount);
			});
		});

		describe('Cell State Updates', () => {
			it('should update cell state after processing events', async () => {
				await eventStorePort.publishEvent(notebookId, 'cell.created', {
					cellId: 'cell-1',
					kind: 'js',
					value: 'const test = 1;',
					position: 0,
					createdAt: new Date().toISOString()
				});

				await notebookService.hydrateNotebook();

				expect(notebookService.cells).toHaveLength(2);
				expect(notebookService.cells[0].kind).toBe('js');
				expect(notebookService.cells[0].value).toBe('const test = 1;');
			});

			it('should handle notebook with existing cells', async () => {
				// Add initial cell
				await notebookService.addCell('js', 'const existing = 1;', 0);

				// Add event to store
				await eventStorePort.publishEvent(notebookId, 'cell.created', {
					cellId: 'cell-2',
					kind: 'md',
					value: '# New Cell',
					position: 1,
					createdAt: new Date().toISOString()
				});

				await notebookService.hydrateNotebook();

				expect(notebookService.cells).toHaveLength(3);
			});
		});
	});

	describe('registerNotebookCallback', () => {
		it('should register callback successfully', async () => {
			await expect(notebookService.registerNotebookCallback()).resolves.not.toThrow();
		});

		it('should handle callback registration gracefully', async () => {
			// Should not throw even if callback registration fails
			await expect(notebookService.registerNotebookCallback()).resolves.not.toThrow();
		});
	});

	describe('Concurrent Operations', () => {
		it('should handle multiple concurrent cell additions', async () => {
			const promises = [
				notebookService.addCell('js', 'const a = 1;', 0),
				notebookService.addCell('js', 'const b = 2;', 0),
				notebookService.addCell('js', 'const c = 3;', 0)
			];

			await Promise.all(promises);
			await notebookService.hydrateNotebook();

			expect(notebookService.cells).toHaveLength(4);
		});

		it('should handle concurrent updates and moves', async () => {
			// Add initial cells
			await notebookService.addCell('js', 'const first = 1;', 0);
			await notebookService.addCell('js', 'const second = 2;', 1);
			await notebookService.hydrateNotebook();

			const firstCellId = notebookService.cells[0].id;
			const secondCellId = notebookService.cells[1].id;

			// Concurrent operations
			const promises = [
				notebookService.updateCell(firstCellId, { value: 'const updated = 1;' }),
				notebookService.moveCell(secondCellId, 0)
			];

			await Promise.all(promises);
			await notebookService.hydrateNotebook();

			expect(notebookService.cells).toHaveLength(3);
			expect(notebookService.cells[0].id).toBe(secondCellId); // Moved to front
			expect(notebookService.cells[1].value).toBe('const updated = 1;'); // Updated
		});
	});

	describe('Edge Cases', () => {
		it('should handle very long cell values', async () => {
			const longValue = 'a'.repeat(100000);
			await notebookService.addCell('js', longValue, 0);
			await notebookService.hydrateNotebook();

			expect(notebookService.cells[0].value).toBe(longValue);
		});

		it('should handle special characters in cell values', async () => {
			const specialValue = 'const test = "🚀 Hello 世界! @#$%^&*()";';
			await notebookService.addCell('js', specialValue, 0);
			await notebookService.hydrateNotebook();

			expect(notebookService.cells[0].value).toBe(specialValue);
		});

		it('should handle HTML entities in cell values', async () => {
			const htmlValue = '<h1>&lt;Hello&gt; &amp; &quot;World&quot;</h1>';
			await notebookService.addCell('html', htmlValue, 0);
			await notebookService.hydrateNotebook();

			expect(notebookService.cells[0].value).toBe(htmlValue);
		});

		it('should handle rapid successive operations', async () => {
			// Add cell
			await notebookService.addCell('js', 'const test = 1;', 0);
			await notebookService.hydrateNotebook();
			const cellId = notebookService.cells[0].id;

			// Rapid updates
			for (let i = 0; i < 10; i++) {
				await notebookService.updateCell(cellId, { value: `const test = ${i};` });
			}
			await notebookService.hydrateNotebook();

			expect(notebookService.cells[0].value).toBe('const test = 9;');
		});
	});
});
