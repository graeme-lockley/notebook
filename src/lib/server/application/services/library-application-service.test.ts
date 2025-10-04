import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LibraryApplicationService } from './library-application-service';
import { EventStoreTestImpl } from '$lib/server/adapters/outbound/event-store/inmemory/event-store';
import type { EventStore } from '$lib/server/application/ports/outbound/event-store';
import type { StandaloneWebSocketBroadcaster } from '$lib/server/websocket/standalone-broadcaster';

describe('LibraryApplicationService', () => {
	let eventStore: EventStore;
	let eventBroadcaster: StandaloneWebSocketBroadcaster;
	let libraryService: LibraryApplicationService;

	beforeEach(async () => {
		eventStore = new EventStoreTestImpl();
		eventBroadcaster = {
			broadcastCustomEvent: vi.fn()
		} as unknown as StandaloneWebSocketBroadcaster;

		// Create the library topic
		await eventStore.createTopic('library', []);

		libraryService = new LibraryApplicationService(eventStore, eventBroadcaster);
		await libraryService.initialize();
	});

	describe('createNotebook', () => {
		it('should create notebook and publish event', async () => {
			const [notebookId, eventId] = await libraryService.createNotebook(
				'Test Notebook',
				'Test Description'
			);

			expect(notebookId).toBeDefined();
			expect(eventId).toBeDefined();

			// Check that event was published
			const events = await eventStore.getEvents('library');
			expect(events).toHaveLength(1);
			expect(events[0].type).toBe('notebook.created');
			expect(events[0].payload.title).toBe('Test Notebook');
			expect(events[0].payload.description).toBe('Test Description');
		});

		it('should create notebook without description', async () => {
			const [notebookId, eventId] = await libraryService.createNotebook('Test Notebook');

			expect(notebookId).toBeDefined();
			expect(eventId).toBeDefined();

			// Check that event was published
			const events = await eventStore.getEvents('library');
			expect(events).toHaveLength(1);
			expect(events[0].payload.description).toBeUndefined();
		});
	});

	describe('updateNotebook', () => {
		it('should update notebook and publish event', async () => {
			// First create a notebook
			const [notebookId] = await libraryService.createNotebook(
				'Original Title',
				'Original Description'
			);

			// Update the notebook
			const eventId = await libraryService.updateNotebook(notebookId, {
				title: 'Updated Title',
				description: 'Updated Description'
			});

			expect(eventId).toBeDefined();

			// Check that update event was published
			const events = await eventStore.getEvents('library');
			expect(events).toHaveLength(2);
			expect(events[1].type).toBe('notebook.updated');
			expect(events[1].payload.notebookId).toBe(notebookId);
			expect(
				(events[1].payload as { changes: { title: string; description: string } }).changes.title
			).toBe('Updated Title');
			expect(
				(events[1].payload as { changes: { title: string; description: string } }).changes
					.description
			).toBe('Updated Description');
		});
	});

	describe('deleteNotebook', () => {
		it('should delete notebook and publish event', async () => {
			// First create a notebook
			const [notebookId] = await libraryService.createNotebook('Test Title');

			// Delete the notebook
			const eventId = await libraryService.deleteNotebook(notebookId);

			expect(eventId).toBeDefined();

			// Check that delete event was published
			const events = await eventStore.getEvents('library');
			expect(events).toHaveLength(2);
			expect(events[1].type).toBe('notebook.deleted');
			expect(events[1].payload.notebookId).toBe(notebookId);
		});
	});

	describe('getNotebook', () => {
		it('should return null for non-existent notebook', () => {
			const notebook = libraryService.getNotebook('non-existent');
			expect(notebook).toBeNull();
		});

		it('should return notebook after creation', async () => {
			const [notebookId] = await libraryService.createNotebook('Test Notebook', 'Test Description');

			const notebook = libraryService.getNotebook(notebookId);

			expect(notebook).not.toBeNull();
			expect(notebook?.title).toBe('Test Notebook');
			expect(notebook?.description).toBe('Test Description');
		});
	});

	describe('getNotebookService', () => {
		it('should return undefined for non-existent notebook', async () => {
			const service = await libraryService.getNotebookService('non-existent');
			expect(service).toBeUndefined();
		});

		it('should create and return notebook service', async () => {
			const [notebookId] = await libraryService.createNotebook('Test Notebook');

			const service = await libraryService.getNotebookService(notebookId);

			expect(service).toBeDefined();
			expect(service?.id).toBe(notebookId);
		});
	});
});
