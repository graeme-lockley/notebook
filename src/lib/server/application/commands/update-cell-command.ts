import type { CellKind } from '$lib/server/domain/value-objects';

export interface UpdateCellCommand {
	notebookId: string;
	cellId: string;
	updates: Partial<{
		kind: CellKind;
		value: string;
	}>;
}

export interface UpdateCellCommandResult {
	eventId: string;
}
