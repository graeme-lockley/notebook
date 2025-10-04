import type {
	CellCreatedEvent,
	CellDeletedEvent,
	CellMovedEvent,
	CellUpdatedEvent
} from '../events/notebook.events';
import type { Cell, CellKind } from '../value-objects';

/**
 * Pure domain service for notebook operations.
 * Contains only business logic and returns domain events.
 * No infrastructure dependencies.
 */
export interface NotebookDomainService {
	readonly id: string;
	get cells(): Cell[];
	get lastEventId(): string | null;

	// Event creation methods - return domain events instead of publishing them
	createWelcomeCellEvent(): CellCreatedEvent;
	createCellEvent(kind: CellKind, value: string, position: number): CellCreatedEvent;
	createDeleteCellEvent(cellId: string): CellDeletedEvent;
	createUpdateCellEvent(
		cellId: string,
		updates: Partial<{ kind: CellKind; value: string }>
	): CellUpdatedEvent;
	createMoveCellEvent(cellId: string, position: number): CellMovedEvent;

	// Event handling - processes events to update internal state
	eventHandler(
		event:
			| CellCreatedEvent
			| CellUpdatedEvent
			| CellDeletedEvent
			| (CellMovedEvent & { id: string })
	): void;
}
