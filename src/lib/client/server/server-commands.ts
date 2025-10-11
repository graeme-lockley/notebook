import type { CellKind } from '$lib/server/domain/value-objects/CellKind';
import { clientIdToServerId } from '$lib/client/model/cell';
import type {
	CreateNotebookResponse,
	UpdateNotebookRequest,
	UpdateNotebookResponse
} from '$lib/types/api-contracts';
import { apiRequest } from './api-client';

export async function createNotebook(
	name: string,
	description: string | undefined
): Promise<CreateNotebookResponse> {
	const response = await apiRequest<{ title: string; description: string }, CreateNotebookResponse>(
		'/api/notebooks',
		'POST',
		{
			title: name,
			description: description || ''
		}
	);

	if (!response) {
		throw new Error('Failed to create notebook: No response received');
	}

	return response;
}

export async function updateNotebook(
	notebookId: string,
	updates: { title?: string; description?: string }
): Promise<UpdateNotebookResponse> {
	const response = await apiRequest<UpdateNotebookRequest, UpdateNotebookResponse>(
		`/api/notebooks/${notebookId}`,
		'PATCH',
		updates
	);

	if (!response) {
		throw new Error('Failed to update notebook: No response received');
	}

	return response;
}

export async function addCell(
	notebookId: string | undefined,
	kind: CellKind,
	value: string,
	position: number
): Promise<void> {
	if (!notebookId) return;

	await apiRequest(`/api/notebooks/${notebookId}/cells`, 'POST', {
		kind,
		value,
		position
	});
}

export async function updateCell(
	notebookId: string | undefined,
	cellId: string,
	updates: { kind?: string; value?: string }
): Promise<void> {
	if (!notebookId) return;

	// Get the server cell ID from the mapping
	const serverCellId = clientIdToServerId(cellId);

	await apiRequest(`/api/notebooks/${notebookId}/cells/${serverCellId}`, 'PATCH', updates);
}

export async function deleteCell(notebookId: string | undefined, cellId: string): Promise<void> {
	if (!notebookId) return;

	// Get the server cell ID from the mapping
	const serverCellId = clientIdToServerId(cellId);

	await apiRequest(`/api/notebooks/${notebookId}/cells/${serverCellId}`, 'DELETE');
}

export async function moveCell(
	notebookId: string | undefined,
	cellId: string,
	position: number
): Promise<void> {
	if (!notebookId) return;

	// Get the server cell ID from the mapping
	const serverCellId = clientIdToServerId(cellId);

	await apiRequest(`/api/notebooks/${notebookId}/cells/${serverCellId}`, 'PATCH', { position });
}

export async function duplicateCell(notebookId: string | undefined, cellId: string): Promise<void> {
	if (!notebookId) return;

	// Get the server cell ID from the mapping
	const serverCellId = clientIdToServerId(cellId);

	await apiRequest(`/api/notebooks/${notebookId}/cells/${serverCellId}/duplicate`, 'POST');
}
