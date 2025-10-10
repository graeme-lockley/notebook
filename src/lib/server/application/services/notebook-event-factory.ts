import type { CellKind, Cell } from '$lib/server/domain/value-objects';
import type {
	CellCreatedEvent,
	CellUpdatedEvent,
	CellDeletedEvent,
	CellMovedEvent
} from '$lib/server/domain/events/notebook.events';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

/**
 * Stateless event factory for notebook cell operations.
 * Uses projection state for validation instead of maintaining its own state.
 */
export class NotebookEventFactory {
	/**
	 * Create a cell.created event with validation
	 */
	static createCellEvent(
		notebookId: string,
		kind: CellKind,
		value: string,
		position: number,
		currentCells: Cell[]
	): CellCreatedEvent {
		// Validate required fields
		if (!kind || !value || position === undefined) {
			throw new Error('kind, value, and position are required');
		}

		// Validate cell kind
		if (!['js', 'md', 'html'].includes(kind)) {
			throw new Error('Invalid cell kind. Must be js, md, or html');
		}

		// Validate position
		if (position < 0 || position > currentCells.length) {
			throw new Error(`Invalid position: ${position}. Valid range: 0-${currentCells.length}`);
		}

		// Generate a unique cell ID
		const cellId = `cell-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

		logger.info(
			`NotebookEventFactory: Creating cell.created event for ${kind} cell in notebook ${notebookId} at position ${position}`
		);

		return {
			type: 'cell.created',
			payload: {
				cellId,
				kind,
				value,
				position,
				createdAt: new Date().toISOString()
			}
		};
	}

	/**
	 * Create a cell.updated event with validation
	 */
	static createUpdateCellEvent(
		notebookId: string,
		cellId: string,
		updates: Partial<{ kind: CellKind; value: string }>,
		currentCells: Cell[]
	): CellUpdatedEvent {
		// Validate that cell exists
		const cellExists = currentCells.some((cell) => cell.id === cellId);
		if (!cellExists) {
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

		logger.info(
			`NotebookEventFactory: Creating cell.updated event for cell ${cellId} in notebook ${notebookId}`
		);

		return {
			type: 'cell.updated',
			payload: {
				cellId,
				changes: updates,
				updatedAt: new Date().toISOString()
			}
		};
	}

	/**
	 * Create a cell.deleted event with validation
	 */
	static createDeleteCellEvent(
		notebookId: string,
		cellId: string,
		currentCells: Cell[]
	): CellDeletedEvent {
		// Validate that cell exists
		const cellExists = currentCells.some((cell) => cell.id === cellId);
		if (!cellExists) {
			throw new Error(`Cell not found: ${cellId}`);
		}

		logger.info(
			`NotebookEventFactory: Creating cell.deleted event for cell ${cellId} in notebook ${notebookId}`
		);

		return {
			type: 'cell.deleted',
			payload: {
				cellId,
				deletedAt: new Date().toISOString()
			}
		};
	}

	/**
	 * Create a cell.moved event with validation
	 */
	static createMoveCellEvent(
		notebookId: string,
		cellId: string,
		position: number,
		currentCells: Cell[]
	): CellMovedEvent {
		// Validate that cell exists
		const cellExists = currentCells.some((cell) => cell.id === cellId);
		if (!cellExists) {
			throw new Error(`Cell not found: ${cellId}`);
		}

		// Validate position
		if (position < 0 || position > currentCells.length) {
			throw new Error(`Invalid position: ${position}. Valid range: 0-${currentCells.length}`);
		}

		logger.info(
			`NotebookEventFactory: Creating cell.moved event for cell ${cellId} to position ${position} in notebook ${notebookId}`
		);

		return {
			type: 'cell.moved',
			payload: {
				cellId,
				position,
				movedAt: new Date().toISOString()
			}
		};
	}

	/**
	 * Create a welcome cell event (for new notebooks)
	 */
	static createWelcomeCellEvent(notebookId: string): CellCreatedEvent {
		return NotebookEventFactory.createCellEvent(
			notebookId,
			'md',
			`# Welcome to Your Notebook\n\nThis is your new notebook. Start adding cells to create your content!\n\nYou can:\n- Add JavaScript cells with \`+\`\n- Add Markdown cells for documentation\n- Add HTML cells for rich content\n\nHappy coding! 🚀`,
			0,
			[] // Empty notebook
		);
	}
}
