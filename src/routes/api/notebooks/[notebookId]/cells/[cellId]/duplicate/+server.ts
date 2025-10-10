import { json } from '@sveltejs/kit';
import { logger } from '$lib/common/infrastructure/logging/logger.service';
import type { RequestEvent } from '@sveltejs/kit';
import type { DuplicateCellResponse, ApiError } from '$lib/types/api-contracts';

export async function POST({ params, locals }: RequestEvent): Promise<Response> {
	const timestamp = Date.now();
	const requestId = `${timestamp}-${Math.random().toString(36).substring(2, 8)}`;

	logger.info(
		`API: [${requestId}] Duplicate endpoint called for notebook ${params.notebookId}, cell ${params.cellId}`
	);

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

		// Execute duplicate command via service
		const result = await locals.notebookCommandService.duplicateCell(notebookId, cellId);

		logger.info(
			`API: [${requestId}] Duplicated cell ${cellId} in notebook ${notebookId} -> new cell ${result.cellId}`
		);

		const response: DuplicateCellResponse = {
			message: 'Cell duplicated successfully',
			notebookId,
			cellId: result.cellId,
			eventId: result.eventId
		};
		return json(response, { status: 201 });
	} catch (error) {
		logger.error('Error duplicating cell:', error);
		const errorResponse: ApiError = { error: 'Failed to duplicate cell' };
		return json(errorResponse, { status: 500 });
	}
}
