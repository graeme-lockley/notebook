import type { CellKind } from '$lib/types/cell';

export type CellCreatedEvent = {
	cellBeforeId: string | undefined;
	cellAfterId: string | undefined;
	cellKind: CellKind;
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
