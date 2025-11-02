import type { CellKind } from '../value-objects/CellKind';

export type NotebookVisibility = 'private' | 'public' | 'protected';

export interface NotebookCreatedEvent {
	type: 'notebook.created';
	payload: {
		notebookId: string;
		title: string;
		description?: string;
		visibility: NotebookVisibility;
		ownerId: string | null; // UserId or null for public/unowned
		createdAt: string; // ISO timestamp string
	};
}

export interface NotebookUpdatedEvent {
	type: 'notebook.updated';
	payload: {
		notebookId: string;
		changes: Partial<{
			title: string;
			description: string;
			visibility: NotebookVisibility;
		}>;
		updatedAt: string; // ISO timestamp string
	};
}

export interface NotebookDeletedEvent {
	type: 'notebook.deleted';
	payload: {
		notebookId: string;
		deletedAt: string; // ISO timestamp string
	};
}

export interface CellCreatedEvent {
	type: 'cell.created';
	payload: {
		cellId: string;
		kind: CellKind;
		value: string;
		position: number;
		createdAt: string; // ISO timestamp string
	};
}

export interface CellUpdatedEvent {
	type: 'cell.updated';
	payload: {
		cellId: string;
		changes: Partial<{
			value: string;
			kind: CellKind;
			isClosed: boolean;
		}>;
		updatedAt: string; // ISO timestamp string
	};
}

export interface CellDeletedEvent {
	type: 'cell.deleted';
	payload: {
		cellId: string;
		deletedAt: string; // ISO timestamp string
	};
}

export interface CellMovedEvent {
	type: 'cell.moved';
	payload: {
		cellId: string;
		position: number;
		movedAt: string; // ISO timestamp string
	};
}

export interface NotebookViewedEvent {
	type: 'notebook.viewed';
	payload: {
		notebookId: string;
		userId: string;
		viewedAt: string; // ISO timestamp string
	};
}

export type LibraryEvent =
	| NotebookCreatedEvent
	| NotebookUpdatedEvent
	| NotebookDeletedEvent
	| NotebookViewedEvent;

export type NotebookEvent = CellCreatedEvent | CellUpdatedEvent | CellDeletedEvent | CellMovedEvent;

export interface EventStoreConfig {
	baseUrl: string;
	timeout: number;
	retries: number;
	retryDelay: number;
}
