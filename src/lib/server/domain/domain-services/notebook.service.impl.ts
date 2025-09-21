import type { EventStore } from '$lib/server/application/ports/outbound/event-store';
import { NOTEBOOK_EVENT_SCHEMAS } from '$lib/server/adapters/outbound/event-store/remote/schemas';
import { logger } from '$lib/server/infrastructure/logging/logger.service';
import type {
	CellCreatedEvent,
	CellDeletedEvent,
	CellMovedEvent,
	CellUpdatedEvent,
	LibraryEvent,
	NotebookCreatedEvent,
	NotebookDeletedEvent,
	NotebookEvent,
	NotebookUpdatedEvent
} from '$lib/server/domain/events/notebook.events';
import type {
	LibraryService,
	NotebookService
} from '$lib/server/application/ports/inbound/notebook-service';
import { Library } from './library';
import type { Cell, Notebook } from '$lib/server/domain/value-objects';

export function createLibraryService(eventStore: EventStore): LibraryService {
	return new LibraryServiceImpl(eventStore);
}

class LibraryServiceImpl implements LibraryService {
	private lastEventId: string | null = null;
	private _eventStore: EventStore;
	private library: Library = new Library();
	private notebookServices: Map<string, NotebookService> = new Map<string, NotebookService>();

	constructor(eventStore: EventStore) {
		this._eventStore = eventStore;
	}

	async createNotebook(title: string, description?: string): Promise<[string, string]> {
		const notebookId = this.generateNotebookId();

		// Validate title
		if (!title || typeof title !== 'string' || title.trim() === '') {
			throw new Error('Title is required');
		}

		// Publish event
		const event: NotebookCreatedEvent = {
			type: 'notebook.created',
			payload: {
				notebookId,
				title,
				description,
				createdAt: new Date().toISOString()
			}
		};

		const eventId = await this.publishEvent(event);
		logger.info(`Created notebook: ${notebookId}`);

		return [notebookId, eventId];
	}

	getNotebook(notebookId: string): Notebook | null {
		const notebook = this.library.get(notebookId);
		if (!notebook) {
			return null;
		}
		return { ...notebook };
	}

	async getNotebookService(notebookId: string): Promise<NotebookService | undefined> {
		if (this.library.has(notebookId)) {
			const result = this.notebookServices.get(notebookId);
			if (result === undefined) {
				const newResult = new NotebookServiceImpl(notebookId, this._eventStore);

				logger.info(`LibraryService: getNotebookService: ${notebookId}: initializing notebook`);
				await newResult.initializeNotebook();
				logger.info(`LibraryService: getNotebookService: ${notebookId}: hydrating notebook`);
				await newResult.hydrateNotebook();
				logger.info(
					`LibraryService: getNotebookService: ${notebookId}: registering notebook callback`
				);
				await newResult.registerNotebookCallback();

				this.notebookServices.set(notebookId, newResult);
				return newResult;
			} else {
				logger.info(`LibraryService: getNotebookService: ${notebookId}: ${JSON.stringify(result)}`);
			}
			return result;
		} else {
			logger.info(`LibraryService: getNotebookService: ${notebookId}: Not found`);
			return undefined;
		}
	}

	private getNotebookId(notebookId: string): Notebook {
		const nb = this.library.get(notebookId);

		if (!nb) {
			throw new Error(`Notebook not found: ${notebookId}`);
		}
		return nb;
	}

	async updateNotebook(
		notebookId: string,
		updates: Partial<{ title: string; description: string }>
	): Promise<string> {
		this.getNotebookId(notebookId);

		if (updates.title === '') {
			throw new Error('Title is required');
		}

		// Publish event
		const event: NotebookUpdatedEvent = {
			type: 'notebook.updated',
			payload: {
				notebookId: notebookId,
				changes: updates,
				updatedAt: new Date().toISOString()
			}
		};

		const eventId = await this.publishEvent(event);
		logger.info(`Updated notebook: ${notebookId}`);

		return eventId;
	}

	async deleteNotebook(notebookId: string): Promise<string> {
		this.getNotebookId(notebookId);

		// Publish event
		const event: NotebookDeletedEvent = {
			type: 'notebook.deleted',
			payload: {
				notebookId: notebookId,
				deletedAt: new Date().toISOString()
			}
		};

		const eventId = await this.publishEvent(event);
		logger.info(`Deleted notebook: ${notebookId}`);

		return eventId;
	}

	async publishEvent(event: LibraryEvent): Promise<string> {
		// Publish to the main notebooks topic
		return await this._eventStore.publishEvent('library', event.type, event.payload);
	}

	private generateNotebookId(): string {
		function generateProposedNotebookId(): string {
			return `notebook-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
		}

		let notebookId = generateProposedNotebookId();
		while (this.library.has(notebookId)) {
			notebookId = generateProposedNotebookId();
		}
		return notebookId;
	}

	eventHandler(event: LibraryEvent & { id: string }): void {
		// Check if this event has already been processed
		if (hasEventBeenProcessed(event.id, this.lastEventId)) {
			logger.info(`LibraryService: eventHandler: Event already processed, skipping: ${event.id}`);
			return;
		}

		const type = event.type;
		switch (type) {
			case 'notebook.created': {
				logger.info(
					`LibraryService: eventHandler: notebook.created: ${JSON.stringify(event.payload)}`
				);
				const { notebookId, title, description, createdAt } = event.payload;
				if (this.library.has(notebookId)) {
					logger.warn(
						`LibraryService: eventHandler: notebook.created: Notebook already exists: ${notebookId}: ${JSON.stringify(event.payload)}`
					);
				}
				this.library.set(event.payload.notebookId, {
					id: notebookId,
					title,
					description,
					createdAt: new Date(createdAt),
					updatedAt: new Date(createdAt)
				});
				break;
			}
			case 'notebook.updated': {
				logger.info(
					`LibraryService: eventHandler: notebook.updated: ${JSON.stringify(event.payload)}`
				);
				const { notebookId, changes, updatedAt } = event.payload;
				const notebook = this.library.get(notebookId);
				if (notebook === undefined) {
					logger.warn(
						`LibraryService: eventHandler: notebook.updated: Notebook not found: ${notebookId}: ${JSON.stringify(event.payload)}`
					);
				} else {
					if (changes.title !== undefined) {
						notebook.title = changes.title;
					}
					if (changes.description !== undefined) {
						notebook.description = changes.description;
					}
					notebook.updatedAt = new Date(updatedAt);
				}
				break;
			}
			case 'notebook.deleted': {
				logger.info(
					`LibraryService: eventHandler: notebook.deleted: ${JSON.stringify(event.payload)}`
				);
				const { notebookId } = event.payload;
				if (this.library.has(notebookId)) {
					this.library.delete(notebookId);
				} else {
					logger.warn(
						`LibraryService: eventHandler: notebook.deleted: Notebook not found: ${notebookId}: ${JSON.stringify(event.payload)}`
					);
				}
				break;
			}
			default:
				logger.warn(`LibraryService: eventHandler: Unknown notebook event type: ${type}`);
		}

		// Update the last processed event ID
		this.lastEventId = event.id;
	}

	async hydrateLibrary(): Promise<void> {
		const events = await this._eventStore.getEvents('library');
		logger.info(`LibraryService: hydrateLibrary: ${events.length} events`);
		events.forEach((event) => {
			this.eventHandler(event as unknown as LibraryEvent & { id: string });
		});
	}

	async registerLibraryCallback(): Promise<void> {
		logger.info('LibraryService: registerLibraryCallback');

		const callbackUrl = 'http://localhost:5173/api/events/webhook';

		// Get all existing consumers
		const existingConsumers = await this._eventStore.getConsumers();

		// Remove any existing consumers with the same callback URL
		for (const consumer of existingConsumers) {
			if (consumer.callback === callbackUrl && 'library' in consumer.topics) {
				logger.info(
					`LibraryService: Removing existing library consumer with callback: ${callbackUrl}`
				);
				await this._eventStore.unregisterConsumer(consumer.id);
			}
		}

		// Register the new consumer
		await this._eventStore.registerConsumer(callbackUrl, { library: this.lastEventId });
	}
}

export class NotebookServiceImpl implements NotebookService {
	id: string;
	eventStore: EventStore;
	lastEventId: string | null = null;
	private _cells: Cell[] = [];

	constructor(id: string, eventStore: EventStore) {
		this.id = id;
		this.eventStore = eventStore;
	}

	topicName(): string {
		return this.id;
	}

	get cells(): Cell[] {
		return this._cells;
	}

	async initializeNotebook(): Promise<void> {
		// Determine if the topic with the notebook id exists, if not, create it, and
		// add a default Markdown cell with a welcome message of sorts.

		try {
			// If no events exist, this is a new notebook that needs initialization
			if (await isValidTopic(this.eventStore, this.topicName())) {
				logger.info(
					`LibraryService: initializeNotebook: Notebook topic already exists: ${this.topicName()}`
				);
			} else {
				logger.info(
					`LibraryService: initializeNotebook: Creating new notebook topic: ${this.topicName()}`
				);

				await this.eventStore.createTopic(this.topicName(), NOTEBOOK_EVENT_SCHEMAS);

				// Add a welcome markdown cell using the addCell method
				await this.addCell(
					'md',
					`# Welcome to Your Notebook\n\nThis is your new notebook. Start adding cells to create your content!\n\nYou can:\n- Add JavaScript cells with \`+\`\n- Add Markdown cells for documentation\n- Add HTML cells for rich content\n\nHappy coding! 🚀`,
					0
				);

				logger.info(
					`LibraryService: initializeNotebook: Created welcome cell for notebook: ${this.id}`
				);
			}
		} catch (error) {
			logger.error(
				`LibraryService: initializeNotebook: Failed to initialize notebook ${this.id}:`,
				error
			);
			throw error;
		}
	}

	async addCell(kind: 'js' | 'md' | 'html', value: string, position: number): Promise<void> {
		try {
			// Validate required fields
			if (!kind || !value || position === undefined) {
				throw new Error('kind, value, and position are required');
			}

			// Validate cell kind
			if (!['js', 'md', 'html'].includes(kind)) {
				throw new Error('Invalid cell kind. Must be js, md, or html');
			}

			if (position < 0 || position > this.cells.length) {
				throw new Error(`Invalid position: ${position}`);
			}

			// Generate a unique cell ID
			const cellId = `cell-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

			// Create the cell creation event
			const cellEvent: CellCreatedEvent = {
				type: 'cell.created',
				payload: {
					cellId,
					kind,
					value,
					position,
					createdAt: new Date().toISOString()
				}
			};

			// Publish the event to the notebook's topic
			await this.eventStore.publishEvent(this.topicName(), cellEvent.type, cellEvent.payload);

			logger.info(
				`LibraryService: addCell: Added ${kind} cell ${cellId} to notebook ${this.id} at position ${position}`
			);
		} catch (error) {
			logger.error(`LibraryService: addCell: Failed to add cell to notebook ${this.id}:`, error);
			throw error;
		}
	}

	async deleteCell(cellId: string): Promise<void> {
		try {
			const cellIndex = this._cells.findIndex((cell) => cell.id === cellId);
			if (cellIndex === -1) {
				throw new Error(`Cell not found: ${cellId}`);
			}

			const cellEvent: CellDeletedEvent = {
				type: 'cell.deleted',
				payload: {
					cellId,
					deletedAt: new Date().toISOString()
				}
			};

			await this.eventStore.publishEvent(this.topicName(), cellEvent.type, cellEvent.payload);

			logger.info(`LibraryService: deleteCell: Deleted cell ${cellId} from notebook ${this.id}`);
		} catch (error) {
			logger.error(`LibraryService: deleteCell: Failed to delete cell ${cellId}:`, error);
			throw error;
		}
	}

	async updateCell(
		cellId: string,
		updates: Partial<{ kind: 'js' | 'md' | 'html'; value: string }>
	): Promise<void> {
		try {
			const cellIndex = this._cells.findIndex((cell) => cell.id === cellId);
			if (cellIndex === -1) {
				throw new Error(`Cell not found: ${cellId}`);
			}

			// Validate that at least one field is provided
			if (updates.kind === undefined && updates.value === undefined) {
				throw new Error('At least one field (kind or value) must be provided');
			}

			// Validate cell kind if provided
			if (updates.kind && !['js', 'md', 'html'].includes(updates.kind)) {
				throw new Error('Invalid cell kind. Must be js, md, or html');
			}

			const cellEvent: CellUpdatedEvent = {
				type: 'cell.updated',
				payload: {
					cellId,
					changes: updates,
					updatedAt: new Date().toISOString()
				}
			};

			await this.eventStore.publishEvent(this.topicName(), cellEvent.type, cellEvent.payload);

			logger.info(`LibraryService: updateCell: Updated cell ${cellId} in notebook ${this.id}`);
		} catch (error) {
			logger.error(`LibraryService: updateCell: Failed to update cell ${cellId}:`, error);
			throw error;
		}
	}

	async moveCell(cellId: string, position: number): Promise<void> {
		try {
			logger.info(
				`LibraryService: moveCell: Attempting to move cell ${cellId} to position ${position}`
			);
			logger.info(
				`LibraryService: moveCell: Current cells: ${this._cells.map((c) => c.id).join(', ')}`
			);

			const cellIndex = this._cells.findIndex((cell) => cell.id === cellId);
			if (cellIndex === -1) {
				throw new Error(`Cell not found: ${cellId}`);
			}

			logger.info(`LibraryService: moveCell: Found cell at index ${cellIndex}`);

			if (position < 0 || position > this.cells.length) {
				throw new Error(`Invalid position: ${position}`);
			}

			const cellEvent: CellMovedEvent = {
				type: 'cell.moved',
				payload: {
					cellId,
					position,
					movedAt: new Date().toISOString()
				}
			};

			await this.eventStore.publishEvent(this.topicName(), cellEvent.type, cellEvent.payload);

			logger.info(
				`LibraryService: moveCell: Moved cell ${cellId} to position ${position} in notebook ${this.id}`
			);
		} catch (error) {
			logger.error(`LibraryService: moveCell: Failed to move cell ${cellId}:`, error);
			throw error;
		}
	}

	eventHandler(event: NotebookEvent & { id: string }): void {
		// Check if this event has already been processed
		if (hasEventBeenProcessed(event.id, this.lastEventId)) {
			logger.info(`NotebookService: eventHandler: Event already processed, skipping: ${event.id}`);
			return;
		}

		const type = event.type;
		logger.info(`NotebookService: eventHandler: ${type}: ${JSON.stringify(event.payload)}`);

		switch (type) {
			case 'cell.created': {
				logger.info(
					`NotebookService: eventHandler: cell.created: ${JSON.stringify(event.payload)}`
				);
				const { cellId, kind, value, position, createdAt } = event.payload;
				if (this._cells.find((cell) => cell.id === cellId)) {
					logger.warn(
						`NotebookService: eventHandler: cell.created: Cell already exists: ${cellId}: ${JSON.stringify(event.payload)}`
					);
				}
				this._cells.splice(position, 0, {
					id: cellId,
					kind,
					value,
					createdAt: new Date(createdAt),
					updatedAt: new Date(createdAt)
				});

				break;
			}
			case 'cell.updated': {
				logger.info(
					`NotebookService: eventHandler: cell.updated: ${JSON.stringify(event.payload)}`
				);
				const { cellId, changes, updatedAt } = event.payload;
				const cellIndex = this._cells.findIndex((cell) => cell.id === cellId);
				if (cellIndex !== -1) {
					const existingCell = this._cells[cellIndex];
					this._cells[cellIndex] = {
						...existingCell,
						kind: changes.kind !== undefined ? changes.kind : existingCell.kind,
						value: changes.value !== undefined ? changes.value : existingCell.value,
						updatedAt: new Date(updatedAt)
					};
				} else {
					logger.warn(
						`NotebookService: eventHandler: cell.updated: Cell not found: ${cellId}: ${JSON.stringify(event.payload)}`
					);
				}
				break;
			}
			case 'cell.deleted': {
				logger.info(
					`NotebookService: eventHandler: cell.deleted: ${JSON.stringify(event.payload)}`
				);
				const { cellId } = event.payload;
				const cellIndex = this._cells.findIndex((cell) => cell.id === cellId);
				if (cellIndex !== -1) {
					this._cells.splice(cellIndex, 1);
				} else {
					logger.warn(
						`NotebookService: eventHandler: cell.deleted: Cell not found: ${cellId}: ${JSON.stringify(event.payload)}`
					);
				}
				break;
			}
			case 'cell.moved': {
				logger.info(`NotebookService: eventHandler: cell.moved: ${JSON.stringify(event.payload)}`);
				const { cellId, position } = event.payload;
				const cellIndex = this._cells.findIndex((cell) => cell.id === cellId);

				if (cellIndex === -1) {
					logger.warn(
						`NotebookService: eventHandler: cell.moved: Cell not found: ${cellId}: ${JSON.stringify(event.payload)}`
					);
				} else {
					// Remove the cell from its current position
					const [movedElement] = this._cells.splice(cellIndex, 1);

					// Adjust the target position if we're moving to a position after the current one
					// because removing the cell shifts all subsequent positions down by 1
					const adjustedPosition = position > cellIndex ? position - 1 : position;

					// Insert the cell at the new position
					this._cells.splice(adjustedPosition, 0, movedElement);

					logger.info(
						`Moved cell ${cellId} from position ${cellIndex} to position ${adjustedPosition}`
					);
				}
				break;
			}
			default:
				logger.warn(`NotebookService: eventHandler: Unknown cell event type: ${type}`);
		}

		this.lastEventId = event.id;
	}

	async hydrateNotebook(): Promise<void> {
		const events = await this.eventStore.getEvents(this.topicName());
		logger.info(`LibraryService: hydrateNotebook: ${events.length} events`);
		events.forEach((event) => {
			this.eventHandler(event as unknown as NotebookEvent & { id: string });
		});
	}

	async registerNotebookCallback(): Promise<void> {
		logger.info(`NotebookService: registerLibraryCallback: ${this.id}`);

		const callbackUrl = 'http://localhost:5173/api/events/webhook';

		// Get all existing consumers
		const existingConsumers = await this.eventStore.getConsumers();

		// Remove any existing consumers with the same callback URL
		for (const consumer of existingConsumers) {
			if (consumer.callback === callbackUrl && this.id in consumer.topics) {
				logger.info(
					`LibraryService: Removing existing ${this.id} consumer with callback: ${callbackUrl}`
				);
				await this.eventStore.unregisterConsumer(consumer.id);
			}
		}

		// Register the new consumer
		await this.eventStore.registerConsumer(callbackUrl, { [this.id]: this.lastEventId });
	}
}

function hasEventBeenProcessed(eventId: string, lastEventId: string | null): boolean {
	if (!lastEventId) {
		return false;
	}

	// Parse event IDs to extract sequence numbers
	// Format: <topic>-<number>
	const currentEventNumber = extractSequenceNumber(eventId);
	const lastEventNumber = extractSequenceNumber(lastEventId);

	// If we can't parse the numbers, assume it's a new event
	if (currentEventNumber === null || lastEventNumber === null) {
		return false;
	}

	// Event has been processed if its sequence number is less than or equal to the last processed
	return currentEventNumber <= lastEventNumber;
}

function extractSequenceNumber(eventId: string): number | null {
	// Extract the number from the end of the event ID
	// Format: <topic>-<number>
	const parts = eventId.split('-');
	if (parts.length < 2) {
		return null;
	}

	const sequenceStr = parts[parts.length - 1];
	const sequence = parseInt(sequenceStr, 10);

	return isNaN(sequence) ? null : sequence;
}

async function isValidTopic(eventStore: EventStore, topicName: string): Promise<boolean> {
	try {
		await eventStore.getTopic(topicName);
		return true;
	} catch {
		return false;
	}
}
