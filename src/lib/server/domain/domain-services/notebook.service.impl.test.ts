import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventStoreTestImpl } from '../../adapters/outbound/event-store/inmemory/event-store';
import type { EventStore } from '../../application/ports/outbound/event-store';
import { createLibraryService, NotebookServiceImpl } from './notebook.service.impl';
import type { LibraryService } from '../../application/ports/inbound/notebook-service';
import { LIBRARY_EVENT_SCHEMAS } from '../../adapters/outbound/event-store/remote/schemas';

describe('NotebookServiceImpl', () => {
	let eventStorePort: EventStore;
	let libraryService: LibraryService;

	beforeEach(async () => {
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

		describe('Error Recovery', () => {
			it('should handle event store connection failure gracefully', async () => {
				// Mock event store to simulate connection failure
				const originalPublishEvent = eventStorePort.publishEvent;
				eventStorePort.publishEvent = vi.fn().mockRejectedValue(new Error('Connection failed'));

				const title = 'Test Notebook';
				await expect(libraryService.createNotebook(title)).rejects.toThrow('Connection failed');

				// Restore original method
				eventStorePort.publishEvent = originalPublishEvent;
			});

			it('should handle event store timeout', async () => {
				// Mock event store to simulate timeout
				const originalPublishEvent = eventStorePort.publishEvent;
				eventStorePort.publishEvent = vi.fn().mockRejectedValue(new Error('Request timeout'));

				const title = 'Test Notebook';
				await expect(libraryService.createNotebook(title)).rejects.toThrow('Request timeout');

				// Restore original method
				eventStorePort.publishEvent = originalPublishEvent;
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
});
