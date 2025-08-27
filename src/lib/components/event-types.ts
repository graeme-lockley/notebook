import type { CellKind } from '$lib/model/cell';

export type CellCreatedEvent = {
	cellBeforeId: string | undefined;
	cellAfterId: string | undefined;
	cellKind: CellKind;
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
