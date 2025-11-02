import type { CellKind } from '$lib/server/domain/value-objects/CellKind';

export type CellCreatedEvent = {
	cellBeforeId: string | undefined;
	cellAfterId: string | undefined;
	cellKind: CellKind;
};

export type CreateNotebookEvent = {
	name: string;
	description: string;
	visibility?: 'private' | 'public' | 'protected';
};

export type UpdateNotebookEvent = {
	title?: string;
	description?: string;
	visibility?: 'private' | 'public' | 'protected';
};

export type DeleteCellEvent = {
	id: string;
};

export type DuplicateCellEvent = {
	id: string;
};

export type MoveCellDownEvent = {
	id: string;
};

export type MoveCellUpEvent = {
	id: string;
};

export type SourceKindChangeEvent = {
	id: string;
	kind: CellKind;
};

export type SourceValueChangeEvent = {
	id: string;
	value: string;
};

export type ToggleSourceViewEvent = {
	cellId: string;
};

export type OnFocusEvent = {
	cellId: string;
};
