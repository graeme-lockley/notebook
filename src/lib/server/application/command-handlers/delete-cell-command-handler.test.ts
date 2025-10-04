import { describe, it, expect, beforeEach } from 'vitest';
import { EventStoreTestImpl } from '$lib/server/adapters/outbound/event-store/inmemory/event-store';
import type { EventStore } from '$lib/server/application/ports/outbound/event-store';
import { DeleteCellCommandHandler } from './delete-cell-command-handler';

describe('DeleteCellCommandHandler', () => {
	let eventStore: EventStore;
	let commandHandler: DeleteCellCommandHandler;

	beforeEach(async () => {
		eventStore = new EventStoreTestImpl();
		// Create the notebook topic
		await eventStore.createTopic('test-notebook', []);

		commandHandler = new DeleteCellCommandHandler(eventStore);
	});

	describe('handle', () => {
		it('should delete cell and publish event', async () => {
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

			// Now delete the cell
			const command = {
				notebookId: 'test-notebook',
				cellId: addResult.cellId
			};

			const result = await commandHandler.handle(command);

			expect(result.eventId).toBeDefined();

			// Check that delete event was published
			const events = await eventStore.getEvents('test-notebook');
			expect(events).toHaveLength(2);
			expect(events[1].type).toBe('cell.deleted');
			expect(events[1].payload.cellId).toBe(addResult.cellId);
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

			// Now delete the cell
			const command = {
				notebookId: 'test-notebook',
				cellId: addResult.cellId
			};

			await commandHandler.handle(command);
		});

		it('should validate command', async () => {
			const invalidCommand = {
				notebookId: '',
				cellId: 'test-cell'
			};

			await expect(commandHandler.handle(invalidCommand)).rejects.toThrow(
				'Notebook ID is required'
			);
		});

		it('should validate cell ID', async () => {
			const invalidCommand = {
				notebookId: 'test-notebook',
				cellId: ''
			};

			await expect(commandHandler.handle(invalidCommand)).rejects.toThrow('Cell ID is required');
		});
	});
});
