import { json } from '@sveltejs/kit';
import { logger } from '$lib/common/infrastructure/logging/logger.service';
import type { RequestEvent } from '@sveltejs/kit';
import type {
	UpdateCellRequest,
	UpdateCellResponse,
	DeleteCellResponse,
	ApiError
} from '$lib/types/api-contracts';

export async function PATCH({ params, request, locals }: RequestEvent): Promise<Response> {
	try {
		const { notebookId, cellId } = params;

		if (!notebookId || !cellId) {
			const errorResponse: ApiError = { error: 'Notebook ID and Cell ID are required' };
			return json(errorResponse, { status: 400 });
		}

		const body: UpdateCellRequest = await request.json();
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

		// If position is provided, this is a move operation
		if (position !== undefined) {
			const result = await locals.notebookCommandService.moveCell(notebookId, cellId, position);

			logger.info(`Moved cell ${cellId} to position ${position} in notebook ${notebookId}`);

			const response: UpdateCellResponse = {
				message: 'Cell moved successfully',
				notebookId,
				cellId,
				position,
				eventId: result.eventId
			};
			return json(response);
		}

		// Otherwise, this is an update operation
		if (kind === undefined && value === undefined) {
			const errorResponse: ApiError = {
				error: 'Either kind, value, or position must be provided'
			};
			return json(errorResponse, { status: 400 });
		}

		const result = await locals.notebookCommandService.updateCell(notebookId, cellId, {
			kind,
			value
		});

		logger.info(`Updated cell ${cellId} in notebook ${notebookId}`);

		const response: UpdateCellResponse = {
			message: 'Cell updated successfully',
			notebookId,
			cellId,
			updates: { kind, value },
			eventId: result.eventId
		};
		return json(response);
	} catch (error) {
		logger.error('Error updating/moving cell:', error);
		const errorResponse: ApiError = { error: 'Failed to update/move cell' };
		return json(errorResponse, { status: 500 });
	}
}

export async function DELETE({ params, locals }: RequestEvent): Promise<Response> {
	try {
		const { notebookId, cellId } = params;

		if (!notebookId || !cellId) {
			const errorResponse: ApiError = { error: 'Notebook ID and Cell ID are required' };
			return json(errorResponse, { status: 400 });
		}

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

		const result = await locals.notebookCommandService.deleteCell(notebookId, cellId);

		const response: DeleteCellResponse = {
			message: 'Cell deleted successfully',
			notebookId,
			cellId,
			eventId: result.eventId
		};
		return json(response);
	} catch (error) {
		logger.error('Error deleting cell:', error);
		const errorResponse: ApiError = { error: 'Failed to delete cell', message: String(error) };
		return json(errorResponse, { status: 500 });
	}
}
