import { logger } from '$lib/server/infrastructure/logging/logger.service';
import type {
	CellCreatedEvent,
	CellDeletedEvent,
	CellMovedEvent,
	CellUpdatedEvent,
	NotebookEvent
} from '$lib/server/domain/events/notebook.events';
import type { Cell, CellKind } from '$lib/server/domain/value-objects';
import type { NotebookDomainService } from './notebook.domain-service';

export class NotebookServiceImpl implements NotebookDomainService {
	id: string;
	private _lastEventId: string | null = null;
	private _cells: Cell[] = [];

	constructor(id: string) {
		this.id = id;
	}

	topicName(): string {
		return this.id;
	}

	get cells(): Cell[] {
		return this._cells;
	}

	get lastEventId(): string | null {
		return this._lastEventId;
	}

	createWelcomeCellEvent(): CellCreatedEvent {
		return this.createCellEvent(
			'md',
			`# Welcome to Your Notebook\n\nThis is your new notebook. Start adding cells to create your content!\n\nYou can:\n- Add JavaScript cells with \`+\`\n- Add Markdown cells for documentation\n- Add HTML cells for rich content\n\nHappy coding! 🚀`,
			0
		);
	}

	createCellEvent(kind: CellKind, value: string, position: number): CellCreatedEvent {
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

		logger.info(
			`NotebookService: createCellEvent: Created ${kind} cell ${cellId} for notebook ${this.id} at position ${position}`
		);

		return cellEvent;
	}

	createDeleteCellEvent(cellId: string): CellDeletedEvent {
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

		logger.info(
			`NotebookService: createDeleteCellEvent: Created delete event for cell ${cellId} in notebook ${this.id}`
		);

		return cellEvent;
	}

	createUpdateCellEvent(
		cellId: string,
		updates: Partial<{ kind: CellKind; value: string }>
	): CellUpdatedEvent {
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

		logger.info(
			`NotebookService: createUpdateCellEvent: Created update event for cell ${cellId} in notebook ${this.id}`
		);

		return cellEvent;
	}

	createMoveCellEvent(cellId: string, position: number): CellMovedEvent {
		logger.info(
			`NotebookService: createMoveCellEvent: Attempting to move cell ${cellId} to position ${position}`
		);
		logger.info(
			`NotebookService: createMoveCellEvent: Current cells: ${this._cells.map((c) => c.id).join(', ')}`
		);

		const cellIndex = this._cells.findIndex((cell) => cell.id === cellId);
		if (cellIndex === -1) {
			throw new Error(`Cell not found: ${cellId}`);
		}

		logger.info(`NotebookService: createMoveCellEvent: Found cell at index ${cellIndex}`);

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

		logger.info(
			`NotebookService: createMoveCellEvent: Created move event for cell ${cellId} to position ${position} in notebook ${this.id}`
		);

		return cellEvent;
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
