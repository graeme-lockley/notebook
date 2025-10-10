import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventStoreTestImpl } from '$lib/server/adapters/outbound/event-store/inmemory/event-store';
import type { EventStore } from '$lib/server/application/ports/outbound/event-store';
import { AddCellCommandHandler } from './add-cell-command-handler';
import { NotebookProjectionManager } from '../services/notebook-projection-manager';
import { SimpleEventBus } from '../adapters/outbound/simple-event-bus';

describe('AddCellCommandHandler', () => {
	let eventStore: EventStore;
	let projectionManager: NotebookProjectionManager;
	let commandHandler: AddCellCommandHandler;

	let eventBus: SimpleEventBus;

	beforeEach(async () => {
		eventStore = new EventStoreTestImpl();
		eventBus = new SimpleEventBus();
		projectionManager = new NotebookProjectionManager(eventStore, eventBus, {
			gracePeriodMs: 100,
			enableEventStreaming: false
		});

		// Create the notebook topic
		await eventStore.createTopic('test-notebook', []);

		commandHandler = new AddCellCommandHandler(eventStore, projectionManager, eventBus);
	});

	afterEach(async () => {
		await projectionManager.shutdown();
	});

	describe('handle', () => {
		it('should add cell and publish event', async () => {
			const command = {
				notebookId: 'test-notebook',
				kind: 'js' as const,
				value: 'console.log("test");',
				position: 0
			};

			const result = await commandHandler.handle(command);

			expect(result.cellId).toBeDefined();
			expect(result.eventId).toBeDefined();

			// Check that event was published
			const events = await eventStore.getEvents('test-notebook');
			expect(events).toHaveLength(1);
			expect(events[0].type).toBe('cell.created');
			expect(events[0].payload.kind).toBe('js');
			expect(events[0].payload.value).toBe('console.log("test");');
		});

		it('should broadcast via WebSocket', async () => {
			const command = {
				notebookId: 'test-notebook',
				kind: 'js' as const,
				value: 'console.log("test");',
				position: 0
			};

			await commandHandler.handle(command);
		});

		it('should validate command', async () => {
			const invalidCommand = {
				notebookId: '',
				kind: 'js' as const,
				value: 'test',
				position: 0
			};

			await expect(commandHandler.handle(invalidCommand)).rejects.toThrow(
				'Notebook ID is required'
			);
		});

		it('should validate cell kind', async () => {
			const invalidCommand = {
				notebookId: 'test-notebook',
				kind: undefined as unknown as 'js',
				value: 'test',
				position: 0
			};

			await expect(commandHandler.handle(invalidCommand)).rejects.toThrow('Cell kind is required');
		});

		it('should validate cell value', async () => {
			const invalidCommand = {
				notebookId: 'test-notebook',
				kind: 'js' as const,
				value: null as unknown as string,
				position: 0
			};

			await expect(commandHandler.handle(invalidCommand)).rejects.toThrow('Cell value is required');
		});

		it('should validate position', async () => {
			const invalidCommand = {
				notebookId: 'test-notebook',
				kind: 'js' as const,
				value: 'test',
				position: -1
			};

			await expect(commandHandler.handle(invalidCommand)).rejects.toThrow(
				'Position must be non-negative'
			);
		});
	});
});
