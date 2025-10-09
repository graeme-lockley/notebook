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
	event?: { id: string };
	cells: Array<{
		id: string;
		kind: CellKind;
		value: string;
	}>;
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
		const eventId = payload.event?.id;
		logger.info('Received notebook.updated event:', payload.event);

		if (eventId && this.eventSequencer.isEventNewer(eventId)) {
			logger.info('Processing newer event:', eventId);
			await this.syncCellsFromServer(payload.cells);
			this.eventSequencer.markEventProcessed(eventId);
		} else {
			logger.info(
				'Skipping older event:',
				eventId,
				'last processed:',
				this.eventSequencer.getLastProcessedEventId()
			);
		}
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

	/**
	 * Synchronizes cells from server by rebuilding the entire cell list
	 * @param serverCells - Array of cell data from server
	 * @private
	 */
	private async syncCellsFromServer(
		serverCells: Array<{ id: string; kind: CellKind; value: string }>
	): Promise<void> {
		logger.info('🔄 Updating cells from server:', serverCells.length, 'cells');
		logger.info('📋 Current cells:', this.notebookStore.notebook.cells.length);

		// Simple approach: clear all cells and rebuild from server
		const currentCells = [...this.notebookStore.notebook.cells];

		// Remove all current cells
		for (const cell of currentCells) {
			await this.notebookStore.removeCell(cell.id);
		}

		// Add all cells from server
		for (const serverCell of serverCells) {
			logger.info(
				'➕ Adding cell from server:',
				serverCell.id,
				'kind:',
				serverCell.kind,
				'value:',
				serverCell.value.substring(0, 50)
			);

			await this.notebookStore.addCell({
				id: serverCell.id,
				kind: serverCell.kind,
				value: serverCell.value,
				focus: false
			});
		}

		logger.info('✅ Cells synced from server');
	}
}
