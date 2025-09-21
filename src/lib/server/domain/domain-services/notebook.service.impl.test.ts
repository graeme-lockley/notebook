import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventStoreTestImpl } from '../../adapters/outbound/event-store/inmemory/event-store';
import type { EventStore } from '../../application/ports/outbound/event-store';
import { createLibraryService, NotebookServiceImpl } from './notebook.service.impl';
import type { LibraryService } from '../../application/ports/inbound/notebook-service';
import { LIBRARY_EVENT_SCHEMAS } from '../../adapters/outbound/event-store/remote/schemas';
import type {
	NotebookCreatedEvent,
	NotebookUpdatedEvent,
	NotebookDeletedEvent,
	LibraryEvent
} from '../../domain/events/notebook.events';
import { logger, type LoggerConfig } from '../../infrastructure/logging/logger.service';

describe('NotebookServiceImpl', () => {
	let eventStorePort: EventStore;
	let libraryService: LibraryService;
	let previousLoggerConfig: LoggerConfig;

	beforeEach(async () => {
		// Configure logger to be silent during tests and store previous config
		previousLoggerConfig = logger.configure({
			enableInfo: false, // Make info messages silent for testing
			enableWarn: false,
			enableError: true,
			enableDebug: false
		});

		// Create a test EventStore implementation for isolated testing
		eventStorePort = new EventStoreTestImpl();

		// Create the 'library' topic with proper schemas for notebook events
		await eventStorePort.createTopic('library', LIBRARY_EVENT_SCHEMAS);

		libraryService = createLibraryService(eventStorePort);
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

	describe('EventStore Integration', () => {
		it('should verify test store is working', async () => {
			// Test basic event store functionality
			const health = await eventStorePort.getHealth();
			expect(health.status).toBe('healthy');
			expect(health.consumers).toBe(0);

			// Test connection
			const isConnected = await eventStorePort.testConnection();
			expect(isConnected).toBe(true);

			// Test topics (should include the library topic we created in setup)
			const topics = await eventStorePort.getTopics();
			expect(topics).toHaveLength(1);
			expect(topics[0].name).toBe('library');
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

	describe('createNotebook', () => {
		describe('Happy Path', () => {
			it('should create notebook with valid title only', async () => {
				const title = 'My Test Notebook';
				const [notebookId, eventId] = await libraryService.createNotebook(title);

				expect(notebookId).toBeDefined();
				expect(eventId).toBeDefined();
				expect(typeof notebookId).toBe('string');
				expect(typeof eventId).toBe('string');
				expect(notebookId).toMatch(/^notebook-\d+-[a-z0-9]+$/);
			});

			it('should create notebook with valid title and description', async () => {
				const title = 'My Test Notebook';
				const description = 'This is a test notebook description';
				const [notebookId, eventId] = await libraryService.createNotebook(title, description);

				expect(notebookId).toBeDefined();
				expect(eventId).toBeDefined();
				expect(typeof notebookId).toBe('string');
				expect(typeof eventId).toBe('string');
			});

			it('should create notebook with single word title', async () => {
				const title = 'Notebook';
				const [notebookId, eventId] = await libraryService.createNotebook(title);

				expect(notebookId).toBeDefined();
				expect(eventId).toBeDefined();
			});

			it('should create notebook with multi-word title', async () => {
				const title = 'My Amazing Test Notebook';
				const [notebookId, eventId] = await libraryService.createNotebook(title);

				expect(notebookId).toBeDefined();
				expect(eventId).toBeDefined();
			});

			it('should create notebook with title containing special characters', async () => {
				const title = 'My Notebook (v1.0) - Special!';
				const [notebookId, eventId] = await libraryService.createNotebook(title);

				expect(notebookId).toBeDefined();
				expect(eventId).toBeDefined();
			});

			it('should create notebook with title containing numbers', async () => {
				const title = 'Notebook 2024 v1.0';
				const [notebookId, eventId] = await libraryService.createNotebook(title);

				expect(notebookId).toBeDefined();
				expect(eventId).toBeDefined();
			});

			it('should create notebook with Unicode characters in title', async () => {
				const title = 'My Notebook 🚀 with émojis';
				const [notebookId, eventId] = await libraryService.createNotebook(title);

				expect(notebookId).toBeDefined();
				expect(eventId).toBeDefined();
			});

			it('should create notebook with empty description', async () => {
				const title = 'Test Notebook';
				const description = '';
				const [notebookId, eventId] = await libraryService.createNotebook(title, description);

				expect(notebookId).toBeDefined();
				expect(eventId).toBeDefined();
			});

			it('should create notebook with undefined description', async () => {
				const title = 'Test Notebook';
				const [notebookId, eventId] = await libraryService.createNotebook(title, undefined);

				expect(notebookId).toBeDefined();
				expect(eventId).toBeDefined();
			});

			it('should create notebook with description containing newlines', async () => {
				const title = 'Test Notebook';
				const description = 'Line 1\nLine 2\nLine 3';
				const [notebookId, eventId] = await libraryService.createNotebook(title, description);

				expect(notebookId).toBeDefined();
				expect(eventId).toBeDefined();
			});

			it('should create notebook with description containing special characters', async () => {
				const title = 'Test Notebook';
				const description = 'Description with <html> & "quotes" and \'apostrophes\'';
				const [notebookId, eventId] = await libraryService.createNotebook(title, description);

				expect(notebookId).toBeDefined();
				expect(eventId).toBeDefined();
			});
		});

		describe('Validation', () => {
			it('should throw error for empty title', async () => {
				const title = '';
				await expect(libraryService.createNotebook(title)).rejects.toThrow('Title is required');
			});

			it('should throw error for whitespace-only title', async () => {
				const title = '   ';
				await expect(libraryService.createNotebook(title)).rejects.toThrow('Title is required');
			});

			it('should throw error for null title', async () => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(libraryService.createNotebook(null as any)).rejects.toThrow();
			});

			it('should throw error for undefined title', async () => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(libraryService.createNotebook(undefined as any)).rejects.toThrow();
			});

			it('should throw error for non-string title (number)', async () => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(libraryService.createNotebook(123 as any)).rejects.toThrow();
			});

			it('should throw error for non-string title (object)', async () => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(libraryService.createNotebook({} as any)).rejects.toThrow();
			});

			it('should throw error for non-string title (array)', async () => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(libraryService.createNotebook([] as any)).rejects.toThrow();
			});
		});

		describe('Event Store Integration', () => {
			it('should publish notebook.created event to library topic', async () => {
				const title = 'Test Notebook';
				const description = 'Test Description';
				const [notebookId] = await libraryService.createNotebook(title, description);

				// Get events from the library topic
				const events = await eventStorePort.getEvents('library');
				expect(events).toHaveLength(1);

				const event = events[0];
				expect(event.type).toBe('notebook.created');
				expect(event.payload.notebookId).toBe(notebookId);
				expect(event.payload.title).toBe(title);
				expect(event.payload.description).toBe(description);
				expect(event.payload.createdAt).toBeDefined();
				expect(typeof event.payload.createdAt).toBe('string');
				expect(new Date(event.payload.createdAt as string)).toBeInstanceOf(Date);
			});

			it('should publish event with correct structure', async () => {
				const title = 'Test Notebook';
				const [notebookId, eventId] = await libraryService.createNotebook(title);

				const events = await eventStorePort.getEvents('library');
				const event = events[0];

				expect(event).toHaveProperty('type', 'notebook.created');
				expect(event).toHaveProperty('payload');
				expect(event.payload).toHaveProperty('notebookId', notebookId);
				expect(event.payload).toHaveProperty('title', title);
				expect(event.payload).toHaveProperty('description', undefined);
				expect(event.payload).toHaveProperty('createdAt');
				expect(event.id).toBe(eventId);
			});

			it('should handle event store publish failure', async () => {
				// Mock event store to throw error on publish
				const originalPublishEvent = eventStorePort.publishEvent;
				eventStorePort.publishEvent = vi.fn().mockRejectedValue(new Error('Event store failure'));

				const title = 'Test Notebook';
				await expect(libraryService.createNotebook(title)).rejects.toThrow('Event store failure');

				// Restore original method
				eventStorePort.publishEvent = originalPublishEvent;
			});
		});

		describe('ID Generation', () => {
			it('should generate unique IDs for multiple notebooks', async () => {
				const title1 = 'Notebook 1';
				const title2 = 'Notebook 2';
				const title3 = 'Notebook 3';

				const [id1] = await libraryService.createNotebook(title1);
				const [id2] = await libraryService.createNotebook(title2);
				const [id3] = await libraryService.createNotebook(title3);

				expect(id1).not.toBe(id2);
				expect(id2).not.toBe(id3);
				expect(id1).not.toBe(id3);
			});

			it('should generate IDs with correct format', async () => {
				const title = 'Test Notebook';
				const [notebookId] = await libraryService.createNotebook(title);

				// Should match pattern: notebook-{timestamp}-{random}
				expect(notebookId).toMatch(/^notebook-\d+-[a-z0-9]+$/);
			});

			it('should generate IDs with recent timestamp', async () => {
				const beforeTime = Date.now();
				const title = 'Test Notebook';
				const [notebookId] = await libraryService.createNotebook(title);
				const afterTime = Date.now();

				// Extract timestamp from ID
				const timestampMatch = notebookId.match(/^notebook-(\d+)-/);
				expect(timestampMatch).toBeTruthy();

				const idTimestamp = parseInt(timestampMatch![1], 10);
				expect(idTimestamp).toBeGreaterThanOrEqual(beforeTime);
				expect(idTimestamp).toBeLessThanOrEqual(afterTime);
			});

			it('should create multiple notebooks with same title but different IDs', async () => {
				const title = 'Same Title';
				const [id1] = await libraryService.createNotebook(title);
				const [id2] = await libraryService.createNotebook(title);

				expect(id1).not.toBe(id2);
			});
		});

		describe('Library State', () => {
			it('should not immediately add notebook to library before event processing', async () => {
				const title = 'Test Notebook';
				const [notebookId] = await libraryService.createNotebook(title);

				// Before processing events, notebook should not be in library
				const notebook = libraryService.getNotebook(notebookId);
				expect(notebook).toBeNull();
			});

			it('should add notebook to library after event processing', async () => {
				const title = 'Test Notebook';
				const description = 'Test Description';
				const [notebookId] = await libraryService.createNotebook(title, description);

				// Process the event
				await libraryService.hydrateLibrary();

				// After processing events, notebook should be in library
				const notebook = libraryService.getNotebook(notebookId);
				expect(notebook).not.toBeNull();
				expect(notebook!.id).toBe(notebookId);
				expect(notebook!.title).toBe(title);
				expect(notebook!.description).toBe(description);
				expect(notebook!.createdAt).toBeInstanceOf(Date);
				expect(notebook!.updatedAt).toBeInstanceOf(Date);
			});
		});

		describe('Edge Cases', () => {
			it('should create notebook with minimum valid title (1 character)', async () => {
				const title = 'A';
				const [notebookId, eventId] = await libraryService.createNotebook(title);

				expect(notebookId).toBeDefined();
				expect(eventId).toBeDefined();
			});

			it('should create notebook with very long title', async () => {
				const title = 'A'.repeat(1000); // 1000 character title
				const [notebookId, eventId] = await libraryService.createNotebook(title);

				expect(notebookId).toBeDefined();
				expect(eventId).toBeDefined();
			});

			it('should create notebook with very long description', async () => {
				const title = 'Test Notebook';
				const description = 'A'.repeat(10000); // 10000 character description
				const [notebookId, eventId] = await libraryService.createNotebook(title, description);

				expect(notebookId).toBeDefined();
				expect(eventId).toBeDefined();
			});

			it('should create notebook with title containing HTML entities', async () => {
				const title = 'Notebook &amp; Test &lt;script&gt;';
				const [notebookId, eventId] = await libraryService.createNotebook(title);

				expect(notebookId).toBeDefined();
				expect(eventId).toBeDefined();
			});

			it('should create notebook with title containing SQL injection attempts', async () => {
				const title = "'; DROP TABLE notebooks; --";
				const [notebookId, eventId] = await libraryService.createNotebook(title);

				expect(notebookId).toBeDefined();
				expect(eventId).toBeDefined();
			});

			it('should create notebook with title containing XSS attempts', async () => {
				const title = '<script>alert("xss")</script>';
				const [notebookId, eventId] = await libraryService.createNotebook(title);

				expect(notebookId).toBeDefined();
				expect(eventId).toBeDefined();
			});

			it('should create notebook with title containing emojis', async () => {
				const title = '🚀 My Notebook 🎉 with émojis 🎨';
				const [notebookId, eventId] = await libraryService.createNotebook(title);

				expect(notebookId).toBeDefined();
				expect(eventId).toBeDefined();
			});
		});

		describe('Concurrent Operations', () => {
			it('should handle multiple concurrent notebook creations', async () => {
				const promises = Array.from({ length: 10 }, (_, i) =>
					libraryService.createNotebook(`Concurrent Notebook ${i}`)
				);

				const results = await Promise.all(promises);

				// All should succeed
				expect(results).toHaveLength(10);

				// All IDs should be unique
				const ids = results.map(([id]) => id);
				const uniqueIds = new Set(ids);
				expect(uniqueIds.size).toBe(10);
			});

			it('should not have race conditions in ID generation', async () => {
				const promises = Array.from({ length: 50 }, (_, i) =>
					libraryService.createNotebook(`Race Test Notebook ${i}`)
				);

				const results = await Promise.all(promises);
				const ids = results.map(([id]) => id);
				const uniqueIds = new Set(ids);

				// All IDs should be unique (no collisions)
				expect(uniqueIds.size).toBe(50);
			});
		});

		describe('Return Value Validation', () => {
			it('should return tuple with notebook ID and event ID', async () => {
				const title = 'Test Notebook';
				const result = await libraryService.createNotebook(title);

				expect(Array.isArray(result)).toBe(true);
				expect(result).toHaveLength(2);
				expect(typeof result[0]).toBe('string'); // notebook ID
				expect(typeof result[1]).toBe('string'); // event ID
			});

			it('should return different event IDs for different notebooks', async () => {
				const [, eventId1] = await libraryService.createNotebook('Notebook 1');
				const [, eventId2] = await libraryService.createNotebook('Notebook 2');

				expect(eventId1).not.toBe(eventId2);
			});
		});
	});

	describe('getNotebook', () => {
		describe('Happy Path', () => {
			it('should get existing notebook by valid ID', async () => {
				const title = 'Test Notebook';
				const description = 'Test Description';
				const [notebookId] = await libraryService.createNotebook(title, description);

				// Process the event to add notebook to library
				await libraryService.hydrateLibrary();

				const notebook = libraryService.getNotebook(notebookId);

				expect(notebook).not.toBeNull();
				expect(notebook!.id).toBe(notebookId);
				expect(notebook!.title).toBe(title);
				expect(notebook!.description).toBe(description);
				expect(notebook!.createdAt).toBeInstanceOf(Date);
				expect(notebook!.updatedAt).toBeInstanceOf(Date);
			});

			it('should get notebook with description', async () => {
				const title = 'Notebook with Description';
				const description = 'This notebook has a description';
				const [notebookId] = await libraryService.createNotebook(title, description);

				await libraryService.hydrateLibrary();

				const notebook = libraryService.getNotebook(notebookId);

				expect(notebook).not.toBeNull();
				expect(notebook!.description).toBe(description);
			});

			it('should get notebook without description', async () => {
				const title = 'Notebook without Description';
				const [notebookId] = await libraryService.createNotebook(title);

				await libraryService.hydrateLibrary();

				const notebook = libraryService.getNotebook(notebookId);

				expect(notebook).not.toBeNull();
				expect(notebook!.description).toBeUndefined();
			});

			it('should return notebook with correct structure', async () => {
				const title = 'Structure Test Notebook';
				const [notebookId] = await libraryService.createNotebook(title);

				await libraryService.hydrateLibrary();

				const notebook = libraryService.getNotebook(notebookId);

				expect(notebook).not.toBeNull();
				expect(notebook).toHaveProperty('id');
				expect(notebook).toHaveProperty('title');
				expect(notebook).toHaveProperty('description');
				expect(notebook).toHaveProperty('createdAt');
				expect(notebook).toHaveProperty('updatedAt');
				expect(typeof notebook!.id).toBe('string');
				expect(typeof notebook!.title).toBe('string');
				expect(notebook!.createdAt).toBeInstanceOf(Date);
				expect(notebook!.updatedAt).toBeInstanceOf(Date);
			});
		});

		describe('Not Found', () => {
			it('should return null for non-existent notebook ID', () => {
				const nonExistentId = 'notebook-nonexistent-123';
				const notebook = libraryService.getNotebook(nonExistentId);

				expect(notebook).toBeNull();
			});

			it('should return null for empty string ID', () => {
				const notebook = libraryService.getNotebook('');

				expect(notebook).toBeNull();
			});

			it('should return null for notebook that was never created', () => {
				const fakeId = 'notebook-fake-456';
				const notebook = libraryService.getNotebook(fakeId);

				expect(notebook).toBeNull();
			});

			it('should return null before event processing', async () => {
				const title = 'Test Notebook';
				const [notebookId] = await libraryService.createNotebook(title);

				// Don't call hydrateLibrary - notebook should not be in library yet
				const notebook = libraryService.getNotebook(notebookId);

				expect(notebook).toBeNull();
			});
		});

		describe('Input Validation', () => {
			it('should handle null ID gracefully', () => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const notebook = libraryService.getNotebook(null as any);

				expect(notebook).toBeNull();
			});

			it('should handle undefined ID gracefully', () => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const notebook = libraryService.getNotebook(undefined as any);

				expect(notebook).toBeNull();
			});

			it('should handle non-string ID (number)', () => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const notebook = libraryService.getNotebook(123 as any);

				expect(notebook).toBeNull();
			});

			it('should handle non-string ID (object)', () => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const notebook = libraryService.getNotebook({} as any);

				expect(notebook).toBeNull();
			});

			it('should handle non-string ID (array)', () => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const notebook = libraryService.getNotebook([] as any);

				expect(notebook).toBeNull();
			});

			it('should handle whitespace-only ID', () => {
				const notebook = libraryService.getNotebook('   ');

				expect(notebook).toBeNull();
			});

			it('should handle ID with special characters', () => {
				const specialId = 'notebook-!@#$%^&*()_+-=[]{}|;:,.<>?';
				const notebook = libraryService.getNotebook(specialId);

				expect(notebook).toBeNull();
			});

			it('should handle ID with Unicode characters', () => {
				const unicodeId = 'notebook-🚀-émojis-测试';
				const notebook = libraryService.getNotebook(unicodeId);

				expect(notebook).toBeNull();
			});
		});

		describe('Defensive Copy', () => {
			it('should return a copy, not the original reference', async () => {
				const title = 'Defensive Copy Test';
				const [notebookId] = await libraryService.createNotebook(title);

				await libraryService.hydrateLibrary();

				const notebook1 = libraryService.getNotebook(notebookId);
				const notebook2 = libraryService.getNotebook(notebookId);

				expect(notebook1).not.toBe(notebook2); // Different object instances
				expect(notebook1).toEqual(notebook2); // But same content
			});

			it('should allow safe modification of returned notebook', async () => {
				const title = 'Modification Test';
				const [notebookId] = await libraryService.createNotebook(title);

				await libraryService.hydrateLibrary();

				const notebook = libraryService.getNotebook(notebookId);
				expect(notebook).not.toBeNull();

				// Modify the returned notebook
				notebook!.title = 'Modified Title';
				notebook!.description = 'Modified Description';

				// Get the notebook again - should be unchanged
				const notebookAgain = libraryService.getNotebook(notebookId);
				expect(notebookAgain!.title).toBe(title); // Original title
				expect(notebookAgain!.description).toBeUndefined(); // Original description
			});

			it('should not expose library internal state', async () => {
				const title = 'Internal State Test';
				const [notebookId] = await libraryService.createNotebook(title);

				await libraryService.hydrateLibrary();

				const notebook = libraryService.getNotebook(notebookId);
				expect(notebook).not.toBeNull();

				// Verify we can't access internal library methods
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				expect((notebook as any).set).toBeUndefined();
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				expect((notebook as any).delete).toBeUndefined();
			});
		});

		describe('Edge Cases', () => {
			it('should handle minimum valid ID (1 character)', () => {
				const notebook = libraryService.getNotebook('a');

				expect(notebook).toBeNull();
			});

			it('should handle very long ID', () => {
				const longId = 'notebook-' + 'a'.repeat(1000);
				const notebook = libraryService.getNotebook(longId);

				expect(notebook).toBeNull();
			});

			it('should handle ID with HTML entities', () => {
				const htmlId = 'notebook-&lt;script&gt;alert("xss")&lt;/script&gt;';
				const notebook = libraryService.getNotebook(htmlId);

				expect(notebook).toBeNull();
			});

			it('should handle ID with SQL injection attempts', () => {
				const sqlId = "notebook-'; DROP TABLE notebooks; --";
				const notebook = libraryService.getNotebook(sqlId);

				expect(notebook).toBeNull();
			});

			it('should handle ID with XSS attempts', () => {
				const xssId = 'notebook-<script>alert("xss")</script>';
				const notebook = libraryService.getNotebook(xssId);

				expect(notebook).toBeNull();
			});

			it('should handle ID with emojis', () => {
				const emojiId = 'notebook-🚀-🎉-🎨-émojis';
				const notebook = libraryService.getNotebook(emojiId);

				expect(notebook).toBeNull();
			});
		});
	});

	describe('hydrateLibrary', () => {
		describe('Event Processing', () => {
			it('should process events from event store and update library', async () => {
				const title = 'Hydrate Test Notebook';
				const description = 'Test Description';
				const [notebookId] = await libraryService.createNotebook(title, description);

				// Before hydration, notebook should not be in library
				expect(libraryService.getNotebook(notebookId)).toBeNull();

				// Hydrate library from events
				await libraryService.hydrateLibrary();

				// After hydration, notebook should be in library
				const notebook = libraryService.getNotebook(notebookId);
				expect(notebook).not.toBeNull();
				expect(notebook!.id).toBe(notebookId);
				expect(notebook!.title).toBe(title);
				expect(notebook!.description).toBe(description);
			});

			it('should process multiple events in correct order', async () => {
				const title1 = 'First Notebook';
				const title2 = 'Second Notebook';
				const [id1] = await libraryService.createNotebook(title1);
				const [id2] = await libraryService.createNotebook(title2);

				// Before hydration, no notebooks should be in library
				expect(libraryService.getNotebook(id1)).toBeNull();
				expect(libraryService.getNotebook(id2)).toBeNull();

				// Hydrate library
				await libraryService.hydrateLibrary();

				// After hydration, both notebooks should be in library
				const notebook1 = libraryService.getNotebook(id1);
				const notebook2 = libraryService.getNotebook(id2);

				expect(notebook1).not.toBeNull();
				expect(notebook1!.title).toBe(title1);
				expect(notebook2).not.toBeNull();
				expect(notebook2!.title).toBe(title2);
			});

			it('should handle empty event store gracefully', async () => {
				// No events published, just call hydrate
				await libraryService.hydrateLibrary();

				// Should not throw any errors
				expect(true).toBe(true);
			});

			it('should be idempotent - multiple calls should not cause issues', async () => {
				const title = 'Idempotent Test';
				const [notebookId] = await libraryService.createNotebook(title);

				// Call hydrate multiple times
				await libraryService.hydrateLibrary();
				await libraryService.hydrateLibrary();
				await libraryService.hydrateLibrary();

				// Should still work correctly
				const notebook = libraryService.getNotebook(notebookId);
				expect(notebook).not.toBeNull();
				expect(notebook!.title).toBe(title);
			});
		});

		describe('Library State Updates', () => {
			it('should update library state after processing events', async () => {
				const title = 'State Update Test';
				const [notebookId] = await libraryService.createNotebook(title);

				// Verify initial state
				expect(libraryService.getNotebook(notebookId)).toBeNull();

				// Process events
				await libraryService.hydrateLibrary();

				// Verify updated state
				const notebook = libraryService.getNotebook(notebookId);
				expect(notebook).not.toBeNull();
				expect(notebook!.title).toBe(title);
			});

			it('should handle library with existing notebooks', async () => {
				// Create first notebook
				const title1 = 'Existing Notebook';
				const [id1] = await libraryService.createNotebook(title1);
				await libraryService.hydrateLibrary();

				// Create second notebook
				const title2 = 'New Notebook';
				const [id2] = await libraryService.createNotebook(title2);

				// Before second hydration
				expect(libraryService.getNotebook(id1)).not.toBeNull();
				expect(libraryService.getNotebook(id2)).toBeNull();

				// Hydrate again
				await libraryService.hydrateLibrary();

				// After second hydration
				expect(libraryService.getNotebook(id1)).not.toBeNull();
				expect(libraryService.getNotebook(id2)).not.toBeNull();
			});
		});
	});

	describe('eventHandler', () => {
		describe('notebook.created Events', () => {
			it('should process notebook.created event correctly', () => {
				const event: NotebookCreatedEvent & { id: string } = {
					id: 'library-1',
					type: 'notebook.created',
					payload: {
						notebookId: 'test-notebook-123',
						title: 'Test Notebook',
						description: 'Test Description',
						createdAt: '2025-01-01T00:00:00.000Z'
					}
				};

				// Before processing
				expect(libraryService.getNotebook('test-notebook-123')).toBeNull();

				// Process event
				libraryService.eventHandler(event);

				// After processing
				const notebook = libraryService.getNotebook('test-notebook-123');
				expect(notebook).not.toBeNull();
				expect(notebook!.id).toBe('test-notebook-123');
				expect(notebook!.title).toBe('Test Notebook');
				expect(notebook!.description).toBe('Test Description');
				expect(notebook!.createdAt).toEqual(new Date('2025-01-01T00:00:00.000Z'));
				expect(notebook!.updatedAt).toEqual(new Date('2025-01-01T00:00:00.000Z'));
			});

			it('should handle notebook.created event without description', () => {
				const event: NotebookCreatedEvent & { id: string } = {
					id: 'library-2',
					type: 'notebook.created',
					payload: {
						notebookId: 'test-notebook-456',
						title: 'Test Notebook No Description',
						createdAt: '2025-01-01T00:00:00.000Z'
					}
				};

				libraryService.eventHandler(event);

				const notebook = libraryService.getNotebook('test-notebook-456');
				expect(notebook).not.toBeNull();
				expect(notebook!.description).toBeUndefined();
			});

			it('should handle duplicate notebook.created events gracefully', () => {
				const event: NotebookCreatedEvent & { id: string } = {
					id: 'library-3',
					type: 'notebook.created',
					payload: {
						notebookId: 'duplicate-notebook',
						title: 'Duplicate Notebook',
						createdAt: '2025-01-01T00:00:00.000Z'
					}
				};

				// Process same event twice
				libraryService.eventHandler(event);
				libraryService.eventHandler(event);

				// Should still work correctly
				const notebook = libraryService.getNotebook('duplicate-notebook');
				expect(notebook).not.toBeNull();
				expect(notebook!.title).toBe('Duplicate Notebook');
			});
		});

		describe('notebook.updated Events', () => {
			it('should process notebook.updated event correctly', () => {
				// First create a notebook
				const createEvent: NotebookCreatedEvent & { id: string } = {
					id: 'library-1',
					type: 'notebook.created',
					payload: {
						notebookId: 'update-test-notebook',
						title: 'Original Title',
						description: 'Original Description',
						createdAt: '2025-01-01T00:00:00.000Z'
					}
				};
				libraryService.eventHandler(createEvent);

				// Then update it
				const updateEvent: NotebookUpdatedEvent & { id: string } = {
					id: 'library-2',
					type: 'notebook.updated',
					payload: {
						notebookId: 'update-test-notebook',
						changes: {
							title: 'Updated Title',
							description: 'Updated Description'
						},
						updatedAt: '2025-01-02T00:00:00.000Z'
					}
				};
				libraryService.eventHandler(updateEvent);

				const notebook = libraryService.getNotebook('update-test-notebook');
				expect(notebook).not.toBeNull();
				expect(notebook!.title).toBe('Updated Title');
				expect(notebook!.description).toBe('Updated Description');
				expect(notebook!.updatedAt).toEqual(new Date('2025-01-02T00:00:00.000Z'));
			});

			it('should handle partial updates (title only)', () => {
				// Create notebook
				const createEvent: NotebookCreatedEvent & { id: string } = {
					id: 'library-1',
					type: 'notebook.created',
					payload: {
						notebookId: 'partial-update-notebook',
						title: 'Original Title',
						description: 'Original Description',
						createdAt: '2025-01-01T00:00:00.000Z'
					}
				};
				libraryService.eventHandler(createEvent);

				// Update only title
				const updateEvent: NotebookUpdatedEvent & { id: string } = {
					id: 'library-2',
					type: 'notebook.updated',
					payload: {
						notebookId: 'partial-update-notebook',
						changes: {
							title: 'Updated Title Only'
						},
						updatedAt: '2025-01-02T00:00:00.000Z'
					}
				};
				libraryService.eventHandler(updateEvent);

				const notebook = libraryService.getNotebook('partial-update-notebook');
				expect(notebook).not.toBeNull();
				expect(notebook!.title).toBe('Updated Title Only');
				expect(notebook!.description).toBe('Original Description'); // Unchanged
			});

			it('should handle partial updates (description only)', () => {
				// Create notebook
				const createEvent: NotebookCreatedEvent & { id: string } = {
					id: 'library-1',
					type: 'notebook.created',
					payload: {
						notebookId: 'desc-update-notebook',
						title: 'Original Title',
						description: 'Original Description',
						createdAt: '2025-01-01T00:00:00.000Z'
					}
				};
				libraryService.eventHandler(createEvent);

				// Update only description
				const updateEvent: NotebookUpdatedEvent & { id: string } = {
					id: 'library-2',
					type: 'notebook.updated',
					payload: {
						notebookId: 'desc-update-notebook',
						changes: {
							description: 'Updated Description Only'
						},
						updatedAt: '2025-01-02T00:00:00.000Z'
					}
				};
				libraryService.eventHandler(updateEvent);

				const notebook = libraryService.getNotebook('desc-update-notebook');
				expect(notebook).not.toBeNull();
				expect(notebook!.title).toBe('Original Title'); // Unchanged
				expect(notebook!.description).toBe('Updated Description Only');
			});

			it('should handle update of non-existent notebook gracefully', () => {
				const updateEvent: NotebookUpdatedEvent & { id: string } = {
					id: 'library-1',
					type: 'notebook.updated',
					payload: {
						notebookId: 'non-existent-notebook',
						changes: {
							title: 'Updated Title'
						},
						updatedAt: '2025-01-02T00:00:00.000Z'
					}
				};

				// Should not throw error
				expect(() => libraryService.eventHandler(updateEvent)).not.toThrow();
			});
		});

		describe('notebook.deleted Events', () => {
			it('should process notebook.deleted event correctly', () => {
				// First create a notebook
				const createEvent: NotebookCreatedEvent & { id: string } = {
					id: 'library-1',
					type: 'notebook.created',
					payload: {
						notebookId: 'delete-test-notebook',
						title: 'To Be Deleted',
						createdAt: '2025-01-01T00:00:00.000Z'
					}
				};
				libraryService.eventHandler(createEvent);

				// Verify it exists
				expect(libraryService.getNotebook('delete-test-notebook')).not.toBeNull();

				// Then delete it
				const deleteEvent: NotebookDeletedEvent & { id: string } = {
					id: 'library-2',
					type: 'notebook.deleted',
					payload: {
						notebookId: 'delete-test-notebook',
						deletedAt: '2025-01-02T00:00:00.000Z'
					}
				};
				libraryService.eventHandler(deleteEvent);

				// Verify it's deleted
				expect(libraryService.getNotebook('delete-test-notebook')).toBeNull();
			});

			it('should handle deletion of non-existent notebook gracefully', () => {
				const deleteEvent: NotebookDeletedEvent & { id: string } = {
					id: 'library-1',
					type: 'notebook.deleted',
					payload: {
						notebookId: 'non-existent-notebook',
						deletedAt: '2025-01-02T00:00:00.000Z'
					}
				};

				// Should not throw error
				expect(() => libraryService.eventHandler(deleteEvent)).not.toThrow();
			});
		});

		describe('Event Deduplication', () => {
			it('should not process the same event twice', () => {
				const event: NotebookCreatedEvent & { id: string } = {
					id: 'library-1',
					type: 'notebook.created',
					payload: {
						notebookId: 'dedup-test-notebook',
						title: 'Dedup Test',
						createdAt: '2025-01-01T00:00:00.000Z'
					}
				};

				// Process event first time
				libraryService.eventHandler(event);
				expect(libraryService.getNotebook('dedup-test-notebook')).not.toBeNull();

				// Process same event again
				libraryService.eventHandler(event);

				// Should still have the notebook (not duplicated)
				const notebook = libraryService.getNotebook('dedup-test-notebook');
				expect(notebook).not.toBeNull();
				expect(notebook!.title).toBe('Dedup Test');
			});

			it('should process events with different IDs', () => {
				const event1: NotebookCreatedEvent & { id: string } = {
					id: 'library-1',
					type: 'notebook.created',
					payload: {
						notebookId: 'different-id-notebook',
						title: 'First Event',
						createdAt: '2025-01-01T00:00:00.000Z'
					}
				};

				const event2: NotebookUpdatedEvent & { id: string } = {
					id: 'library-2',
					type: 'notebook.updated',
					payload: {
						notebookId: 'different-id-notebook',
						changes: {
							title: 'Updated by Second Event'
						},
						updatedAt: '2025-01-02T00:00:00.000Z'
					}
				};

				// Process both events
				libraryService.eventHandler(event1);
				libraryService.eventHandler(event2);

				const notebook = libraryService.getNotebook('different-id-notebook');
				expect(notebook).not.toBeNull();
				expect(notebook!.title).toBe('Updated by Second Event');
			});
		});

		describe('Unknown Event Types', () => {
			it('should handle unknown event types gracefully', () => {
				// Create an unknown event type that matches the LibraryEvent structure
				const unknownEvent = {
					id: 'library-1',
					type: 'unknown.event.type' as const,
					payload: {
						someData: 'value'
					}
				} as unknown as LibraryEvent; // Cast through unknown for unknown event types

				// Should not throw error
				expect(() => libraryService.eventHandler(unknownEvent)).not.toThrow();
			});
		});
	});
});
