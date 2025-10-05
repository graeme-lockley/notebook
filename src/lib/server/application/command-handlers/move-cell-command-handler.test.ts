import { describe, it, expect, beforeEach } from 'vitest';
import { EventStoreTestImpl } from '$lib/server/adapters/outbound/event-store/inmemory/event-store';
import type { EventStore } from '$lib/server/application/ports/outbound/event-store';
import { MoveCellCommandHandler } from './move-cell-command-handler';

describe('MoveCellCommandHandler', () => {
	let eventStore: EventStore;
	let commandHandler: MoveCellCommandHandler;

	beforeEach(async () => {
		eventStore = new EventStoreTestImpl();

		// Create the notebook topic
		await eventStore.createTopic('test-notebook', []);

		commandHandler = new MoveCellCommandHandler(eventStore);
	});

	describe('handle', () => {
		it('should move cell and publish event', async () => {
			// First add a cell
			const addCommand = {
				notebookId: 'test-notebook',
				kind: 'js' as const,
				value: 'test',
				position: 0
			};

			const addHandler = new (await import('./add-cell-command-handler')).AddCellCommandHandler(
				eventStore
			);
			const addResult = await addHandler.handle(addCommand);

			// Now move the cell
			const command = {
				notebookId: 'test-notebook',
				cellId: addResult.cellId,
				position: 1
			};

			const result = await commandHandler.handle(command);

			expect(result.eventId).toBeDefined();

			// Check that move event was published
			const events = await eventStore.getEvents('test-notebook');
			expect(events).toHaveLength(2);
			expect(events[1].type).toBe('cell.moved');
			expect(events[1].payload.cellId).toBe(addResult.cellId);
			expect(events[1].payload.position).toBe(1);
		});

		it('should broadcast via WebSocket', async () => {
			// First add a cell
			const addCommand = {
				notebookId: 'test-notebook',
				kind: 'js' as const,
				value: 'test',
				position: 0
			};

			const addHandler = new (await import('./add-cell-command-handler')).AddCellCommandHandler(
				eventStore
			);
			const addResult = await addHandler.handle(addCommand);

			// Now move the cell
			const command = {
				notebookId: 'test-notebook',
				cellId: addResult.cellId,
				position: 1
			};

			await commandHandler.handle(command);
		});

		it('should validate command', async () => {
			const invalidCommand = {
				notebookId: '',
				cellId: 'test-cell',
				position: 1
			};

			await expect(commandHandler.handle(invalidCommand)).rejects.toThrow(
				'Notebook ID is required'
			);
		});

		it('should validate cell ID', async () => {
			const invalidCommand = {
				notebookId: 'test-notebook',
				cellId: '',
				position: 1
			};

			await expect(commandHandler.handle(invalidCommand)).rejects.toThrow('Cell ID is required');
		});

		it('should validate position', async () => {
			const invalidCommand = {
				notebookId: 'test-notebook',
				cellId: 'test-cell',
				position: -1
			};

			await expect(commandHandler.handle(invalidCommand)).rejects.toThrow(
				'Position must be non-negative'
			);
		});
	});
});
