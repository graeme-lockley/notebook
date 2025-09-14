export interface NotebookCreatedEvent {
	type: 'notebook.created';
	payload: {
		notebookId: string;
		title: string;
		description?: string;
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
		kind: 'js' | 'md' | 'html';
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
			kind: 'js' | 'md' | 'html';
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

export type LibraryEvent = NotebookCreatedEvent | NotebookUpdatedEvent | NotebookDeletedEvent;

export type NotebookEvent = CellCreatedEvent | CellUpdatedEvent | CellDeletedEvent | CellMovedEvent;

export interface EventStoreConfig {
	baseUrl: string;
	timeout: number;
	retries: number;
	retryDelay: number;
}
