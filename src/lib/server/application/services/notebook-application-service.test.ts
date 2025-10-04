import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotebookApplicationService } from './notebook-application-service';
import { EventStoreTestImpl } from '$lib/server/adapters/outbound/event-store/inmemory/event-store';
import type { EventStore } from '$lib/server/application/ports/outbound/event-store';
import type { StandaloneWebSocketBroadcaster } from '$lib/server/websocket/standalone-broadcaster';

describe('NotebookApplicationService', () => {
	let eventStore: EventStore;
	let eventBroadcaster: StandaloneWebSocketBroadcaster;
	let notebookService: NotebookApplicationService;

	beforeEach(async () => {
		eventStore = new EventStoreTestImpl();
		eventBroadcaster = {
			broadcastCustomEvent: vi.fn()
		} as unknown as StandaloneWebSocketBroadcaster;

		// Create the library topic for notebook creation
		await eventStore.createTopic('library', []);

		notebookService = new NotebookApplicationService(eventStore, eventBroadcaster);
	});

	describe('addCell', () => {
		it('should add cell and publish event', async () => {
			const notebookId = 'test-notebook';
			// Create the notebook topic first
			await eventStore.createTopic(notebookId, []);
			await notebookService.addCell(notebookId, 'js', 'console.log("test");', 0);

			// Check that event was published
			const events = await eventStore.getEvents(notebookId);
			expect(events).toHaveLength(1);
			expect(events[0].type).toBe('cell.created');
			expect(events[0].payload.kind).toBe('js');
			expect(events[0].payload.value).toBe('console.log("test");');
		});

		it('should broadcast via WebSocket', async () => {
			const notebookId = 'test-notebook';
			// Create the notebook topic first
			await eventStore.createTopic(notebookId, []);
			await notebookService.addCell(notebookId, 'js', 'console.log("test");', 0);

			expect(eventBroadcaster.broadcastCustomEvent).toHaveBeenCalledWith(
				notebookId,
				'notebook.updated',
				expect.objectContaining({
					cells: expect.any(Array),
					event: expect.objectContaining({
						type: 'cell.created'
					})
				})
			);
		});
	});

	describe('updateCell', () => {
		it('should update cell and publish event', async () => {
			const notebookId = 'test-notebook';
			// Create the notebook topic first
			await eventStore.createTopic(notebookId, []);

			// First add a cell
			await notebookService.addCell(notebookId, 'js', 'original', 0);

			// Get the cell ID from the first event
			const events = await eventStore.getEvents(notebookId);
			const firstCellId = events[0].payload.cellId as string;

			// Update the cell
			await notebookService.updateCell(notebookId, firstCellId, { value: 'updated' });

			// Check that update event was published
			const allEvents = await eventStore.getEvents(notebookId);
			expect(allEvents).toHaveLength(2);
			expect(allEvents[1].type).toBe('cell.updated');
			expect(allEvents[1].payload.cellId).toBe(firstCellId);
			expect((allEvents[1].payload as { changes: { value: string } }).changes.value).toBe(
				'updated'
			);
		});
	});

	describe('deleteCell', () => {
		it('should delete cell and publish event', async () => {
			const notebookId = 'test-notebook';
			// Create the notebook topic first
			await eventStore.createTopic(notebookId, []);

			// First add a cell
			await notebookService.addCell(notebookId, 'js', 'test', 0);

			// Get the cell ID from the first event
			const events = await eventStore.getEvents(notebookId);
			const cellId = events[0].payload.cellId as string;

			// Delete the cell
			await notebookService.deleteCell(notebookId, cellId);

			// Check that delete event was published
			const allEvents = await eventStore.getEvents(notebookId);
			expect(allEvents).toHaveLength(2);
			expect(allEvents[1].type).toBe('cell.deleted');
			expect(allEvents[1].payload.cellId).toBe(cellId);
		});
	});

	describe('moveCell', () => {
		it('should move cell and publish event', async () => {
			const notebookId = 'test-notebook';
			// Create the notebook topic first
			await eventStore.createTopic(notebookId, []);

			// First add a cell
			await notebookService.addCell(notebookId, 'js', 'test', 0);

			// Get the cell ID from the first event
			const events = await eventStore.getEvents(notebookId);
			const cellId = events[0].payload.cellId as string;

			// Move the cell
			await notebookService.moveCell(notebookId, cellId, 1);

			// Check that move event was published
			const allEvents = await eventStore.getEvents(notebookId);
			expect(allEvents).toHaveLength(2);
			expect(allEvents[1].type).toBe('cell.moved');
			expect(allEvents[1].payload.cellId).toBe(cellId);
			expect(allEvents[1].payload.position).toBe(1);
		});
	});
});
