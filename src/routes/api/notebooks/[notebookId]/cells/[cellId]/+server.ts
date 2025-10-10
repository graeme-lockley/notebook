import { json } from '@sveltejs/kit';
import { logger } from '$lib/common/infrastructure/logging/logger.service';
import type { RequestEvent } from '@sveltejs/kit';

export async function PATCH({ params, request, locals }: RequestEvent): Promise<Response> {
	try {
		const { notebookId, cellId } = params;

		if (!notebookId || !cellId) {
			return json({ error: 'Notebook ID and Cell ID are required' }, { status: 400 });
		}

		const body = await request.json();
		const { kind, value, position } = body;

		// Check if notebook exists
		const notebook = locals.libraryService.getNotebook(notebookId);
		if (!notebook) {
			return json({ error: 'Notebook not found' }, { status: 404 });
		}

		// If position is provided, this is a move operation
		if (position !== undefined) {
			const result = await locals.notebookCommandService.moveCell(notebookId, cellId, position);

			logger.info(`Moved cell ${cellId} to position ${position} in notebook ${notebookId}`);

			return json({
				message: 'Cell moved successfully',
				notebookId,
				cellId,
				position,
				eventId: result.eventId
			});
		}

		// Otherwise, this is an update operation
		if (kind === undefined && value === undefined) {
			return json({ error: 'Either kind, value, or position must be provided' }, { status: 400 });
		}

		const result = await locals.notebookCommandService.updateCell(notebookId, cellId, {
			kind,
			value
		});

		logger.info(`Updated cell ${cellId} in notebook ${notebookId}`);

		return json({
			message: 'Cell updated successfully',
			notebookId,
			cellId,
			updates: { kind, value },
			eventId: result.eventId
		});
	} catch (error) {
		logger.error('Error updating/moving cell:', error);
		return json({ error: 'Failed to update/move cell' }, { status: 500 });
	}
}

export async function DELETE({ params, locals }: RequestEvent): Promise<Response> {
	try {
		const { notebookId, cellId } = params;

		if (!notebookId || !cellId) {
			return json({ error: 'Notebook ID and Cell ID are required' }, { status: 400 });
		}

		// Check if notebook exists
		const notebook = locals.libraryService.getNotebook(notebookId);
		if (!notebook) {
			return json({ error: 'Notebook not found' }, { status: 404 });
		}

		const result = await locals.notebookCommandService.deleteCell(notebookId, cellId);

		return json({
			message: 'Cell deleted successfully',
			notebookId,
			cellId,
			eventId: result.eventId
		});
	} catch (error) {
		logger.error('Error deleting cell:', error);
		return json({ error: 'Failed to delete cell', message: error }, { status: 500 });
	}
}
