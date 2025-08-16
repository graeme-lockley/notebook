// Cell type definitions for ObservableHQ clone

export type CellKind = 'js' | 'md' | 'html';

export type CellStatus = 'ok' | 'error' | 'pending';

export interface Cell {
	id: string;
	kind: CellKind;
	value: string;
	status: CellStatus;
	valueHtml: string | null;
	console?: string[];
	isFocused: boolean;
	isPinned: boolean;
	hasError: boolean;
	isClosed: boolean;
}
