import type { CellKind } from '$lib/server/domain/value-objects/CellKind';
import { clientIdToServerId } from '$lib/client/model/cell';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

interface CreateNotebookResponse {
	id: string;
}

export async function createNotebook(
	name: string,
	description: string | undefined
): Promise<CreateNotebookResponse> {
	const response = await fetch('/api/notebooks', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			title: name,
			description: description || ''
		})
	});

	if (!response.ok) {
		throw new Error(`Failed to create notebook: ${response.statusText}`);
	}

	return await response.json();
}

export async function addCell(
	notebookId: string | undefined,
	kind: CellKind,
	value: string,
	position: number
) {
	if (!notebookId) return;

	try {
		const response = await fetch(`/api/notebooks/${notebookId}/cells`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				kind,
				value,
				position
			})
		});

		if (!response.ok) {
			throw new Error(`Failed to add cell: ${response.statusText}`);
		}
	} catch (error) {
		logger.error('Error adding cell:', error);
	}
}

export async function updateCell(
	notebookId: string | undefined,
	cellId: string,
	updates: { kind?: string; value?: string }
) {
	if (!notebookId) return;

	// Get the server cell ID from the mapping
	const serverCellId = clientIdToServerId(cellId);

	try {
		const response = await fetch(`/api/notebooks/${notebookId}/cells/${serverCellId}`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(updates)
		});

		if (!response.ok) {
			throw new Error(`Failed to update cell: ${response.statusText}`);
		}
	} catch (error) {
		logger.error('Error updating cell:', error);
	}
}

export async function deleteCell(notebookId: string | undefined, cellId: string) {
	if (!notebookId) return;

	// Get the server cell ID from the mapping
	const serverCellId = clientIdToServerId(cellId);

	try {
		const response = await fetch(`/api/notebooks/${notebookId}/cells/${serverCellId}`, {
			method: 'DELETE'
		});

		if (!response.ok) {
			throw new Error(`Failed to delete cell: ${response.statusText}`);
		}
	} catch (error) {
		logger.error('Error deleting cell:', error);
	}
}

export async function moveCell(notebookId: string | undefined, cellId: string, position: number) {
	if (!notebookId) return;

	// Get the server cell ID from the mapping
	const serverCellId = clientIdToServerId(cellId);

	try {
		const response = await fetch(`/api/notebooks/${notebookId}/cells/${serverCellId}`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ position: position })
		});

		if (!response.ok) {
			throw new Error(`Failed to move cell: ${response.statusText}`);
		}
	} catch (error) {
		logger.error('Error moving cell:', error);
	}
}

export async function duplicateCell(notebookId: string | undefined, cellId: string) {
	if (!notebookId) return;

	// Get the server cell ID from the mapping
	const serverCellId = clientIdToServerId(cellId);

	try {
		const response = await fetch(`/api/notebooks/${notebookId}/cells/${serverCellId}/duplicate`, {
			method: 'POST'
		});

		if (!response.ok) {
			throw new Error(`Failed to duplicate cell: ${response.statusText}`);
		}
	} catch (error) {
		logger.error('Error duplicating cell:', error);
	}
}
