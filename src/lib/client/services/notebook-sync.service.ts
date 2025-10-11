import type { NotebookStore } from '$lib/client/stores/notebook';
import type { CellKind } from '$lib/server/domain/value-objects/CellKind';
import { serverIdToClientId } from '$lib/client/model/cell';
import { EventSequencer } from '$lib/client/utils/event-sequencer';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

/**
 * Payload for cell.created event
 */
export interface CellCreatedPayload {
	cellId: string;
	kind: CellKind;
	value: string;
	position: number;
	createdAt?: string;
}

/**
 * Payload for cell.updated event
 */
export interface CellUpdatedPayload {
	cellId: string;
	changes: {
		kind?: CellKind;
		value?: string;
	};
}

/**
 * Payload for cell.deleted event
 */
export interface CellDeletedPayload {
	cellId: string;
}

/**
 * Payload for cell.moved event
 */
export interface CellMovedPayload {
	cellId: string;
	position: number;
}

/**
 * Payload for notebook.updated event
 */
export interface NotebookUpdatedPayload {
	notebookId: string;
	changes: {
		title?: string;
		description?: string;
	};
	updatedAt: string;
}

/**
 * Payload for notebook.initialized event
 */
export interface NotebookInitializedPayload {
	cells: Array<{
		id: string;
		kind: CellKind;
		value: string;
	}>;
}

/**
 * NotebookSyncService - Handles synchronizing server events with local notebook state
 *
 * Responsibilities:
 * - Processing cell creation, update, deletion, and move events
 * - Processing notebook-level events
 * - Managing event sequencing and deduplication
 * - Updating the notebook store reactively
 */
export class NotebookSyncService {
	private eventSequencer: EventSequencer;

	constructor(private notebookStore: NotebookStore) {
		this.eventSequencer = new EventSequencer();
	}

	/**
	 * Handles cell.created event from server
	 * @param payload - Cell creation payload
	 */
	async handleCellCreated(payload: CellCreatedPayload): Promise<void> {
		logger.info(`➕ Adding cell ${payload.cellId} at position ${payload.position}`);

		await this.notebookStore.addCell({
			id: payload.cellId,
			kind: payload.kind,
			value: payload.value,
			position: payload.position
		});

		logger.info('✅ Cell created successfully');
	}

	/**
	 * Handles cell.updated event from server
	 * @param payload - Cell update payload
	 */
	async handleCellUpdated(payload: CellUpdatedPayload): Promise<void> {
		const serverCellId = payload.cellId;
		const changes = payload.changes;

		logger.info(`✏️ Updating cell ${serverCellId}:`, changes);

		// Find the client ID that maps to this server ID
		const clientCellId = serverIdToClientId(serverCellId);

		// Update the cell and trigger reactivity
		await this.notebookStore.updateCell(clientCellId, changes);

		logger.info('✅ Cell updated successfully');
	}

	/**
	 * Handles cell.deleted event from server
	 * @param payload - Cell deletion payload
	 */
	async handleCellDeleted(payload: CellDeletedPayload): Promise<void> {
		const serverCellId = payload.cellId;

		logger.info(`🗑️ Deleting cell ${serverCellId}`);
		logger.info(
			`🔍 Current cells before deletion:`,
			this.notebookStore.notebook.cells.map((c) => c.id)
		);

		// Find the client ID that maps to this server ID
		const clientCellId = serverIdToClientId(serverCellId);

		// Remove cell and trigger reactivity
		await this.notebookStore.removeCell(clientCellId);

		logger.info(
			`🔍 Current cells after deletion:`,
			this.notebookStore.notebook.cells.map((c) => c.id)
		);
		logger.info('✅ Cell deleted successfully');
	}

	/**
	 * Handles cell.moved event from server
	 * @param payload - Cell move payload
	 */
	async handleCellMoved(payload: CellMovedPayload): Promise<void> {
		const serverCellId = payload.cellId;
		const position = payload.position;

		logger.info(`↕️ Moving cell ${serverCellId} to position ${position}`);

		// Find the client ID that maps to this server ID
		const clientCellId = serverIdToClientId(serverCellId);

		// Move cell and trigger reactivity
		await this.notebookStore.moveCell(clientCellId, position);

		logger.info('✅ Cell moved successfully');
	}

	/**
	 * Handles notebook.updated event from server
	 * @param payload - Notebook update payload
	 */
	async handleNotebookUpdated(payload: NotebookUpdatedPayload): Promise<void> {
		logger.info('📝 Updating notebook metadata:', payload.changes);

		this.notebookStore.updateMetadata(payload.changes);

		logger.info('✅ Notebook metadata updated successfully');
	}

	/**
	 * Handles notebook.initialized event from server
	 * @param payload - Notebook initialization payload
	 */
	async handleNotebookInitialized(payload: NotebookInitializedPayload): Promise<void> {
		logger.info('Notebook initialized with', payload.cells.length, 'cells');
		// Initial data - cells are already loaded from the API, no action needed
	}

	/**
	 * Resets the event sequencer (useful for reconnections or reloads)
	 */
	resetSequencer(): void {
		this.eventSequencer.reset();
	}
}
