import { json } from '@sveltejs/kit';
import { logger } from '$lib/common/infrastructure/logging/logger.service';
import type { RequestEvent } from '@sveltejs/kit';
import type { AddCellRequest, AddCellResponse, ApiError } from '$lib/types/api-contracts';

export async function POST({ params, request, locals }: RequestEvent): Promise<Response> {
	try {
		const { notebookId } = params;

		if (!notebookId) {
			const errorResponse: ApiError = { error: 'Notebook ID is required' };
			return json(errorResponse, { status: 400 });
		}

		const body: AddCellRequest = await request.json();
		const { kind, value, position } = body;

		// Check if notebook exists
		const notebook = locals.libraryService.getNotebook(notebookId);
		if (!notebook) {
			const errorResponse: ApiError = { error: 'Notebook not found' };
			return json(errorResponse, { status: 404 });
		}

		// Check access control (edit permission)
		const userId = locals.user?.id || null;
		const isAuthenticated = locals.isAuthenticated;
		const canEdit = locals.notebookAccessControlService.canEdit(notebook, userId, isAuthenticated);

		if (!canEdit) {
			logger.warn(
				`Access denied: User ${userId || 'anonymous'} cannot edit notebook ${notebookId}`
			);
			const errorResponse: ApiError = { error: 'Access denied' };
			return json(errorResponse, { status: 403 });
		}

		// Execute command via service
		const result = await locals.notebookCommandService.addCell(notebookId, kind, value, position);

		logger.info(`Added ${kind} cell to notebook ${notebookId} at position ${position}`);

		const response: AddCellResponse = {
			message: 'Cell added successfully',
			notebookId,
			cellId: result.cellId,
			eventId: result.eventId,
			kind,
			position
		};
		return json(response, { status: 201 });
	} catch (error) {
		logger.error('Error adding cell:', error);
		const errorResponse: ApiError = { error: 'Failed to add cell' };
		return json(errorResponse, { status: 500 });
	}
}
