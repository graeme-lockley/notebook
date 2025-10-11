import { describe, it, expect, beforeEach } from 'vitest';
import { LibraryApplicationService } from './library-application-service';
import { EventStoreTestImpl } from '$lib/server/adapters/outbound/event-store/inmemory/event-store';
import { SimpleEventBus } from '$lib/server/application/adapters/outbound/simple-event-bus';
import type { EventStore } from '$lib/server/application/ports/outbound/event-store';

describe('LibraryApplicationService', () => {
	let eventStore: EventStore;
	let eventBus: SimpleEventBus;
	let libraryService: LibraryApplicationService;

	beforeEach(async () => {
		eventStore = new EventStoreTestImpl();
		eventBus = new SimpleEventBus();

		// Create the library topic
		await eventStore.createTopic('library', []);

		libraryService = new LibraryApplicationService(eventStore, eventBus);
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
});
