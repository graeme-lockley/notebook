import type { CellKind } from './CellKind';

export type Cell = {
	id: string;
	kind: CellKind;
	value: string;
	createdAt: Date;
	updatedAt: Date;
};
