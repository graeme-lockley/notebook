import type { NotebookEvent } from '../../../domain/events/notebook.events';
import type { Cell, CellKind } from '../../../domain/value-objects';
import type { EventStore } from '../outbound/event-store';

export interface NotebookService {
	readonly id: string;
	get cells(): Cell[];
	get eventStore(): EventStore;
	get lastEventId(): string | null;

	addCell(kind: CellKind, value: string, position: number): Promise<void>;
	deleteCell(cellId: string): Promise<void>;
	updateCell(cellId: string, updates: Partial<{ kind: CellKind; value: string }>): Promise<void>;
	moveCell(cellId: string, position: number): Promise<void>;

	hydrateNotebook(): Promise<void>;
	eventHandler(event: NotebookEvent & { id: string }): void;
}
