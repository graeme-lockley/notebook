import type { EventStore } from '$lib/server/application/ports/outbound/event-store';
import { NOTEBOOK_EVENT_SCHEMAS } from '$lib/server/adapters/outbound/event-store/remote/schemas';
import { logger } from '$lib/server/infrastructure/logging/logger.service';
import type {
	CellCreatedEvent,
	CellDeletedEvent,
	CellMovedEvent,
	CellUpdatedEvent,
	NotebookEvent
} from '$lib/server/domain/events/notebook.events';
import type { NotebookService } from '$lib/server/application/ports/inbound/notebook-service';
import type { Cell, CellKind } from '$lib/server/domain/value-objects';
import type { StandaloneWebSocketBroadcaster } from '$lib/server/websocket/standalone-broadcaster';

export class NotebookServiceImpl implements NotebookService {
	id: string;
	private _eventStore: EventStore;
	private _lastEventId: string | null = null;
	private _cells: Cell[] = [];
	private _eventBroadcaster?: StandaloneWebSocketBroadcaster;

	constructor(
		id: string,
		eventStore: EventStore,
		eventBroadcaster?: StandaloneWebSocketBroadcaster
	) {
		this.id = id;
		this._eventStore = eventStore;
		this._eventBroadcaster = eventBroadcaster;
	}

	topicName(): string {
		return this.id;
	}

	get cells(): Cell[] {
		return this._cells;
	}

	get eventStore(): EventStore {
		return this._eventStore;
	}

	get lastEventId(): string | null {
		return this._lastEventId;
	}

	async initializeNotebook(): Promise<void> {
		// Determine if the topic with the notebook id exists, if not, create it, and
		// add a default Markdown cell with a welcome message of sorts.

		try {
			// If no events exist, this is a new notebook that needs initialization
			if (await isValidTopic(this._eventStore, this.topicName())) {
				logger.info(
					`LibraryService: initializeNotebook: Notebook topic already exists: ${this.topicName()}`
				);
			} else {
				logger.info(
					`LibraryService: initializeNotebook: Creating new notebook topic: ${this.topicName()}`
				);

				await this._eventStore.createTopic(this.topicName(), NOTEBOOK_EVENT_SCHEMAS);

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

			await this.hydrateNotebook();
		} catch (error) {
			logger.error(
				`LibraryService: initializeNotebook: Failed to initialize notebook ${this.id}:`,
				error
			);
			throw error;
		}
	}

	async addCell(kind: CellKind, value: string, position: number): Promise<void> {
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
			const eventId = await this._eventStore.publishEvent(
				this.topicName(),
				cellEvent.type,
				cellEvent.payload
			);

			// Update local state immediately
			this._cells.splice(position, 0, {
				id: cellId,
				kind,
				value,
				createdAt: new Date(cellEvent.payload.createdAt),
				updatedAt: new Date(cellEvent.payload.createdAt)
			});
			this._lastEventId = eventId;

			// Broadcast update via WebSocket with the updated state
			if (this._eventBroadcaster) {
				this._eventBroadcaster.broadcastCustomEvent(this.id, 'notebook.updated', {
					cells: this._cells,
					event: {
						id: eventId,
						type: cellEvent.type,
						payload: cellEvent.payload
					}
				});
			}

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

			const eventId = await this._eventStore.publishEvent(
				this.topicName(),
				cellEvent.type,
				cellEvent.payload
			);

			// Update local state immediately
			this._cells.splice(cellIndex, 1);
			this._lastEventId = eventId;

			// Broadcast update via WebSocket with the updated state
			if (this._eventBroadcaster) {
				this._eventBroadcaster.broadcastCustomEvent(this.id, 'notebook.updated', {
					cells: this._cells,
					event: {
						id: eventId,
						type: cellEvent.type,
						payload: cellEvent.payload
					}
				});
			}

			logger.info(`LibraryService: deleteCell: Deleted cell ${cellId} from notebook ${this.id}`);
		} catch (error) {
			logger.error(`LibraryService: deleteCell: Failed to delete cell ${cellId}:`, error);
			throw error;
		}
	}

	async updateCell(
		cellId: string,
		updates: Partial<{ kind: CellKind; value: string }>
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

			const eventId = await this._eventStore.publishEvent(
				this.topicName(),
				cellEvent.type,
				cellEvent.payload
			);

			// Update local state immediately
			const existingCell = this._cells[cellIndex];
			this._cells[cellIndex] = {
				...existingCell,
				kind: updates.kind !== undefined ? updates.kind : existingCell.kind,
				value: updates.value !== undefined ? updates.value : existingCell.value,
				updatedAt: new Date(cellEvent.payload.updatedAt)
			};
			this._lastEventId = eventId;

			// Broadcast update via WebSocket with the updated state
			if (this._eventBroadcaster) {
				this._eventBroadcaster.broadcastCustomEvent(this.id, 'notebook.updated', {
					cells: this._cells,
					event: {
						id: eventId,
						type: cellEvent.type,
						payload: cellEvent.payload
					}
				});
			}

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

			const eventId = await this._eventStore.publishEvent(
				this.topicName(),
				cellEvent.type,
				cellEvent.payload
			);

			// Broadcast update via WebSocket
			if (this._eventBroadcaster) {
				this._eventBroadcaster.broadcastCustomEvent(this.id, 'notebook.updated', {
					cells: this._cells,
					event: {
						id: eventId,
						type: cellEvent.type,
						payload: cellEvent.payload
					}
				});
			}

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
		if (hasEventBeenProcessed(event.id, this._lastEventId)) {
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

					// The target position is already correct since we removed the cell
					// No adjustment needed - the position refers to the final array state
					const targetPosition = position;

					// Insert the cell at the new position
					this._cells.splice(targetPosition, 0, movedElement);

					logger.info(
						`Moved cell ${cellId} from position ${cellIndex} to position ${targetPosition}`
					);
				}
				break;
			}
			default:
				logger.warn(`NotebookService: eventHandler: Unknown cell event type: ${type}`);
		}

		this._lastEventId = event.id;
	}

	async hydrateNotebook(): Promise<void> {
		const events = await this._eventStore.getEvents(this.topicName());
		logger.info(`LibraryService: hydrateNotebook: ${events.length} events`);
		events.forEach((event) => {
			this.eventHandler(event as unknown as NotebookEvent & { id: string });
		});
	}

	async registerNotebookCallback(): Promise<void> {
		logger.info(`NotebookService: registerLibraryCallback: ${this.id}`);

		const callbackUrl = 'http://localhost:5173/api/events/webhook';

		// Get all existing consumers
		const existingConsumers = await this._eventStore.getConsumers();

		// Remove any existing consumers with the same callback URL
		for (const consumer of existingConsumers) {
			if (consumer.callback === callbackUrl && this.id in consumer.topics) {
				logger.info(
					`LibraryService: Removing existing ${this.id} consumer with callback: ${callbackUrl}`
				);
				await this._eventStore.unregisterConsumer(consumer.id);
			}
		}

		// Register the new consumer
		await this._eventStore.registerConsumer(callbackUrl, { [this.id]: this._lastEventId });
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
