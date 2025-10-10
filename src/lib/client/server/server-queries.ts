import type { GetNotebookResponse } from '$lib/types/api-contracts';

export async function getNotebook(id: string): Promise<GetNotebookResponse> {
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
