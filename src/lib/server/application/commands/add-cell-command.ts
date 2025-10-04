import type { CellKind } from '$lib/server/domain/value-objects';

export interface AddCellCommand {
	notebookId: string;
	kind: CellKind;
	value: string;
	position: number;
}

export interface AddCellCommandResult {
	cellId: string;
	eventId: string;
}
