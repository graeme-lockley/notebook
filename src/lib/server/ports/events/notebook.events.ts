export interface NotebookCreatedEvent {
	type: 'notebook.created';
	payload: {
		notebookId: string;
		title: string;
		description?: string;
		createdAt: Date;
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
		updatedAt: Date;
	};
}

export interface NotebookDeletedEvent {
	type: 'notebook.deleted';
	payload: {
		notebookId: string;
		deletedAt: Date;
	};
}

export interface CellCreatedEvent {
	type: 'cell.created';
	payload: {
		cellId: string;
		kind: 'js' | 'md' | 'html';
		value: string;
		position: number;
		createdAt: Date;
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
		updatedAt: Date;
	};
}

export interface CellDeletedEvent {
	type: 'cell.deleted';
	payload: {
		cellId: string;
		deletedAt: Date;
	};
}

export interface CellMovedEvent {
	type: 'cell.moved';
	payload: {
		cellId: string;
		notebookId: string;
		oldPosition: number;
		newPosition: number;
		movedAt: Date;
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
