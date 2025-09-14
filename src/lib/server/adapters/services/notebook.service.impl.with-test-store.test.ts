import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventStoreTestImpl } from '../../ports/event-store/event-store.test-impl';
import type { EventStorePort } from '../../ports/event-store/event-store.port';
import { createLibraryService, NotebookServiceImpl } from './notebook.service.impl';
import type { LibraryService } from '../../application/ports/inbound/notebook-service';

describe('NotebookServiceImpl with Test EventStore', () => {
	let eventStorePort: EventStorePort;
	let libraryService: LibraryService;

	beforeEach(async () => {
		// Create a test EventStore implementation for isolated testing
		eventStorePort = new EventStoreTestImpl();
		libraryService = createLibraryService(eventStorePort);
	});

	afterEach(async () => {
		// Clean up test data
		if (eventStorePort instanceof EventStoreTestImpl) {
			eventStorePort.clear();
		}
	});

	describe('Initialization', () => {
		it('should initialize LibraryService successfully with test store', () => {
			expect(libraryService).toBeDefined();
			expect(typeof libraryService.createNotebook).toBe('function');
			expect(typeof libraryService.getNotebook).toBe('function');
			expect(typeof libraryService.getNotebookService).toBe('function');
			expect(typeof libraryService.updateNotebook).toBe('function');
			expect(typeof libraryService.deleteNotebook).toBe('function');
			expect(typeof libraryService.eventHandler).toBe('function');
			expect(typeof libraryService.hydrateLibrary).toBe('function');
			expect(typeof libraryService.registerLibraryCallback).toBe('function');
		});

		it('should initialize NotebookServiceImpl successfully with test store', () => {
			const notebookId = 'test-notebook-123';
			const notebookService = new NotebookServiceImpl(notebookId, eventStorePort);

			expect(notebookService).toBeDefined();
			expect(notebookService.id).toBe(notebookId);
			expect(notebookService.eventStore).toBe(eventStorePort);
			expect(notebookService.cells).toEqual([]);
			expect(notebookService.topicName()).toBe(notebookId);

			// Verify all required methods are present
			expect(typeof notebookService.initializeNotebook).toBe('function');
			expect(typeof notebookService.addCell).toBe('function');
			expect(typeof notebookService.deleteCell).toBe('function');
			expect(typeof notebookService.updateCell).toBe('function');
			expect(typeof notebookService.moveCell).toBe('function');
			expect(typeof notebookService.eventHandler).toBe('function');
			expect(typeof notebookService.hydrateNotebook).toBe('function');
			expect(typeof notebookService.registerNotebookCallback).toBe('function');
		});

		it('should create LibraryService using factory function with test store', () => {
			const libraryServiceFromFactory = createLibraryService(eventStorePort);

			expect(libraryServiceFromFactory).toBeDefined();
			expect(libraryServiceFromFactory).toBeInstanceOf(Object);

			// Verify it implements the LibraryService interface
			const requiredMethods = [
				'createNotebook',
				'getNotebook',
				'getNotebookService',
				'updateNotebook',
				'deleteNotebook',
				'eventHandler',
				'hydrateLibrary',
				'registerLibraryCallback'
			];

			requiredMethods.forEach((method) => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				expect(typeof (libraryServiceFromFactory as any)[method]).toBe('function');
			});
		});

		it('should initialize NotebookServiceImpl with correct initial state using test store', () => {
			const testNotebookId = 'notebook-test-456';
			const notebookService = new NotebookServiceImpl(testNotebookId, eventStorePort);

			// Check initial state
			expect(notebookService.id).toBe(testNotebookId);
			expect(notebookService.eventStore).toBe(eventStorePort);
			expect(notebookService.cells).toEqual([]);
			expect(notebookService.topicName()).toBe(testNotebookId);

			// Verify private properties are properly initialized
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			expect((notebookService as any).lastEventId).toBeNull();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			expect((notebookService as any)._cells).toEqual([]);
		});
	});

	describe('EventStore Integration', () => {
		it('should verify test store is working', async () => {
			// Test basic event store functionality
			const health = await eventStorePort.getHealth();
			expect(health.status).toBe('healthy');
			expect(health.consumers).toBe(0);

			// Test connection
			const isConnected = await eventStorePort.testConnection();
			expect(isConnected).toBe(true);

			// Test topics (should be empty initially)
			const topics = await eventStorePort.getTopics();
			expect(topics).toEqual([]);
		});

		it('should demonstrate dependency inversion principle', () => {
			// The service depends on the EventStorePort interface, not the concrete implementation
			// This allows us to swap implementations easily for testing
			expect(eventStorePort).toBeInstanceOf(EventStoreTestImpl);

			// The service should work with any implementation of EventStorePort
			const notebookService = new NotebookServiceImpl('test-notebook', eventStorePort);
			expect(notebookService.eventStore).toBe(eventStorePort);
		});
	});
});
