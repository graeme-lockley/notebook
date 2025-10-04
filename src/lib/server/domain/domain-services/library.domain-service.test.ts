import { describe, it, expect, beforeEach } from 'vitest';
import { LibraryServiceImpl } from './library.service.impl';

describe('LibraryDomainService', () => {
	let libraryService: LibraryServiceImpl;

	beforeEach(() => {
		libraryService = new LibraryServiceImpl();
	});

	describe('Event Creation', () => {
		it('should create notebook event with correct properties', () => {
			const event = libraryService.createNotebookEvent('Test Notebook', 'Test Description');

			expect(event.type).toBe('notebook.created');
			expect(event.payload.title).toBe('Test Notebook');
			expect(event.payload.description).toBe('Test Description');
			expect(event.payload.notebookId).toBeDefined();
			expect(event.payload.createdAt).toBeDefined();
		});

		it('should create notebook event without description', () => {
			const event = libraryService.createNotebookEvent('Test Notebook');

			expect(event.type).toBe('notebook.created');
			expect(event.payload.title).toBe('Test Notebook');
			expect(event.payload.description).toBeUndefined();
		});

		it('should create update notebook event', () => {
			// First add a notebook to the internal state
			libraryService.eventHandler({
				id: 'test-event-1',
				type: 'notebook.created',
				payload: {
					notebookId: 'test-notebook-1',
					title: 'Original Title',
					description: 'Original Description',
					createdAt: new Date().toISOString()
				}
			});

			const event = libraryService.createUpdateNotebookEvent('test-notebook-1', {
				title: 'Updated Title',
				description: 'Updated Description'
			});

			expect(event.type).toBe('notebook.updated');
			expect(event.payload.notebookId).toBe('test-notebook-1');
			expect(event.payload.changes.title).toBe('Updated Title');
			expect(event.payload.changes.description).toBe('Updated Description');
			expect(event.payload.updatedAt).toBeDefined();
		});

		it('should create delete notebook event', () => {
			// First add a notebook to the internal state
			libraryService.eventHandler({
				id: 'test-event-1',
				type: 'notebook.created',
				payload: {
					notebookId: 'test-notebook-1',
					title: 'Test Title',
					createdAt: new Date().toISOString()
				}
			});

			const event = libraryService.createDeleteNotebookEvent('test-notebook-1');

			expect(event.type).toBe('notebook.deleted');
			expect(event.payload.notebookId).toBe('test-notebook-1');
			expect(event.payload.deletedAt).toBeDefined();
		});
	});

	describe('Event Validation', () => {
		it('should throw error for empty title', () => {
			expect(() => {
				libraryService.createNotebookEvent('');
			}).toThrow('Title is required');
		});

		it('should throw error for whitespace-only title', () => {
			expect(() => {
				libraryService.createNotebookEvent('   ');
			}).toThrow('Title is required');
		});

		it('should throw error for non-existent notebook in update', () => {
			expect(() => {
				libraryService.createUpdateNotebookEvent('non-existent', { title: 'New Title' });
			}).toThrow('Notebook not found');
		});

		it('should throw error for non-existent notebook in delete', () => {
			expect(() => {
				libraryService.createDeleteNotebookEvent('non-existent');
			}).toThrow('Notebook not found');
		});

		it('should trim title in update event', () => {
			// First add a notebook to the internal state
			libraryService.eventHandler({
				id: 'test-event-1',
				type: 'notebook.created',
				payload: {
					notebookId: 'test-notebook-1',
					title: 'Original Title',
					createdAt: new Date().toISOString()
				}
			});

			const event = libraryService.createUpdateNotebookEvent('test-notebook-1', {
				title: '  Trimmed Title  '
			});

			expect(event.payload.changes.title).toBe('Trimmed Title');
		});
	});

	describe('State Management', () => {
		it('should return null for non-existent notebook', () => {
			const notebook = libraryService.getNotebook('non-existent');
			expect(notebook).toBeNull();
		});

		it('should return notebook after creation', () => {
			// Create a notebook event
			const event = libraryService.createNotebookEvent('Test Notebook', 'Test Description');

			// Process the event
			libraryService.eventHandler({ ...event, id: 'test-event-1' });

			// Get the notebook
			const notebook = libraryService.getNotebook(event.payload.notebookId);

			expect(notebook).not.toBeNull();
			expect(notebook?.title).toBe('Test Notebook');
			expect(notebook?.description).toBe('Test Description');
		});
	});

	describe('Event Handling', () => {
		it('should handle notebook created event', () => {
			const event = {
				id: 'test-event-1',
				type: 'notebook.created' as const,
				payload: {
					notebookId: 'test-notebook-1',
					title: 'Test Notebook',
					description: 'Test Description',
					createdAt: new Date().toISOString()
				}
			};

			libraryService.eventHandler(event);

			const notebook = libraryService.getNotebook('test-notebook-1');
			expect(notebook).not.toBeNull();
			expect(notebook?.title).toBe('Test Notebook');
			expect(notebook?.description).toBe('Test Description');
		});

		it('should handle notebook updated event', () => {
			// First create a notebook
			libraryService.eventHandler({
				id: 'test-event-1',
				type: 'notebook.created',
				payload: {
					notebookId: 'test-notebook-1',
					title: 'Original Title',
					description: 'Original Description',
					createdAt: new Date().toISOString()
				}
			});

			// Then update it
			const updateEvent = {
				id: 'test-event-2',
				type: 'notebook.updated' as const,
				payload: {
					notebookId: 'test-notebook-1',
					changes: { title: 'Updated Title' },
					updatedAt: new Date().toISOString()
				}
			};

			libraryService.eventHandler(updateEvent);

			const notebook = libraryService.getNotebook('test-notebook-1');
			expect(notebook?.title).toBe('Updated Title');
			expect(notebook?.description).toBe('Original Description'); // Should remain unchanged
		});

		it('should handle notebook deleted event', () => {
			// First create a notebook
			libraryService.eventHandler({
				id: 'test-event-1',
				type: 'notebook.created',
				payload: {
					notebookId: 'test-notebook-1',
					title: 'Test Title',
					createdAt: new Date().toISOString()
				}
			});

			expect(libraryService.getNotebook('test-notebook-1')).not.toBeNull();

			// Then delete it
			const deleteEvent = {
				id: 'test-event-2',
				type: 'notebook.deleted' as const,
				payload: {
					notebookId: 'test-notebook-1',
					deletedAt: new Date().toISOString()
				}
			};

			libraryService.eventHandler(deleteEvent);

			expect(libraryService.getNotebook('test-notebook-1')).toBeNull();
		});
	});
});
