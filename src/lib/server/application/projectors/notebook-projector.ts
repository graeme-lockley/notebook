import type { EventHandler, DomainEvent } from '../ports/outbound/event-bus';
import type { NotebookReadModel } from '../ports/inbound/read-models';
import { logger } from '$lib/server/infrastructure/logging/logger.service';

export class NotebookProjector implements EventHandler {
	constructor(private readModel: NotebookReadModel) {}

	async handle(event: DomainEvent): Promise<void> {
		logger.debug(`NotebookProjector: Handling event: ${event.type}`);

		switch (event.type) {
			case 'cell.created':
				await this.handleCellCreated(event);
				break;
			case 'cell.updated':
				await this.handleCellUpdated(event);
				break;
			case 'cell.deleted':
				await this.handleCellDeleted(event);
				break;
			case 'cell.moved':
				await this.handleCellMoved(event);
				break;
			default:
				logger.debug(`NotebookProjector: Ignoring event type: ${event.type}`);
		}
	}

	private async handleCellCreated(event: DomainEvent): Promise<void> {
		const payload = event.payload as {
			cellId: string;
			kind: string;
			value: string;
			position: number;
			createdAt: string;
		};

		// Create cell object
		const cell = {
			id: payload.cellId,
			kind: payload.kind as 'js' | 'md' | 'html',
			value: payload.value,
			createdAt: new Date(payload.createdAt),
			updatedAt: new Date(payload.createdAt)
		};

		// Update read model
		if (
			this.readModel instanceof
			(await import('../adapters/inbound/in-memory-notebook-read-model')).InMemoryNotebookReadModel
		) {
			this.readModel.addCellAtPosition(event.aggregateId, cell, payload.position);
		}

		logger.info(
			`NotebookProjector: Cell created: ${payload.cellId} in notebook ${event.aggregateId} at position ${payload.position}`
		);
	}

	private async handleCellUpdated(event: DomainEvent): Promise<void> {
		const payload = event.payload as {
			cellId: string;
			changes: { kind?: string; value?: string };
			updatedAt: string;
		};

		// Get existing cell
		const existingCell = await this.readModel.getCell(event.aggregateId, payload.cellId);
		if (!existingCell) {
			logger.warn(`NotebookProjector: Cell not found for update: ${payload.cellId}`);
			return;
		}

		// Create updated cell
		const updatedCell = {
			...existingCell,
			kind: (payload.changes.kind as 'js' | 'md' | 'html') || existingCell.kind,
			value: payload.changes.value !== undefined ? payload.changes.value : existingCell.value,
			updatedAt: new Date(payload.updatedAt)
		};

		// Update read model
		if (
			this.readModel instanceof
			(await import('../adapters/inbound/in-memory-notebook-read-model')).InMemoryNotebookReadModel
		) {
			this.readModel.updateCell(event.aggregateId, payload.cellId, updatedCell);
		}

		logger.info(
			`NotebookProjector: Cell updated: ${payload.cellId} in notebook ${event.aggregateId}`
		);
	}

	private async handleCellDeleted(event: DomainEvent): Promise<void> {
		const payload = event.payload as {
			cellId: string;
			deletedAt: string;
		};

		// Update read model
		if (
			this.readModel instanceof
			(await import('../adapters/inbound/in-memory-notebook-read-model')).InMemoryNotebookReadModel
		) {
			this.readModel.removeCell(event.aggregateId, payload.cellId);
		}

		logger.info(
			`NotebookProjector: Cell deleted: ${payload.cellId} from notebook ${event.aggregateId}`
		);
	}

	private async handleCellMoved(event: DomainEvent): Promise<void> {
		const payload = event.payload as {
			cellId: string;
			position: number;
			movedAt: string;
		};

		// Update read model
		if (
			this.readModel instanceof
			(await import('../adapters/inbound/in-memory-notebook-read-model')).InMemoryNotebookReadModel
		) {
			this.readModel.moveCell(event.aggregateId, payload.cellId, payload.position);
		}

		logger.info(
			`NotebookProjector: Cell moved: ${payload.cellId} to position ${payload.position} in notebook ${event.aggregateId}`
		);
	}
}
