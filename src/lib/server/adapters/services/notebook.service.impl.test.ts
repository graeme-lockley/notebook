import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventStoreClient } from '../../infrastructure/event-store/client';
import type { EventStoreConfig } from '../../infrastructure/event-store/types';
import type { EventStore } from '../../application/ports/outbound/event-store';
import { createLibraryService, NotebookServiceImpl } from './notebook.service.impl';
import type { LibraryService } from '../../application/ports/inbound/notebook-service';

describe('NotebookServiceImpl', () => {
	let eventStorePort: EventStore;
	let libraryService: LibraryService;
	let eventStoreConfig: EventStoreConfig;

	beforeEach(async () => {
		// Create a real EventStoreClient instance for testing
		// This assumes you have a test event store running or will mock the HTTP layer
		eventStoreConfig = {
			baseUrl: 'http://localhost:8000', // Test event store URL
			timeout: 5000,
			retries: 1,
			retryDelay: 100
		};

		eventStorePort = new EventStoreClient(eventStoreConfig);
		libraryService = createLibraryService(eventStorePort);
	});

	afterEach(async () => {
		// Clean up any resources if needed
	});

	describe('Initialization', () => {
		it('should initialize LibraryService successfully', () => {
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

		it('should initialize NotebookServiceImpl successfully', () => {
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

		it('should create LibraryService using factory function', () => {
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

		it('should initialize NotebookServiceImpl with correct initial state', () => {
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
});
