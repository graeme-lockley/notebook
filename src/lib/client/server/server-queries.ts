import type { CellKind } from '$lib/server/domain/value-objects/CellKind';

export interface NotebookResponse {
	title: string;
	description: string | undefined;

	cells: {
		id: string;
		kind: CellKind;
		value: string;
	}[];
}

export async function getNotebook(id: string): Promise<NotebookResponse> {
	// Fetch notebook data from API
	const response = await fetch(`/api/notebooks/${id}`);

	if (!response.ok) {
		if (response.status === 404) {
			throw new Error('Notebook not found');
		}

		throw new Error(`Failed to load notebook: ${response.statusText}`);
	}

	return await response.json();
}
