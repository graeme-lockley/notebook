import { json } from '@sveltejs/kit';
import { logger } from '$lib/server/infrastructure/logging/logger.service';
import type { RequestEvent } from '@sveltejs/kit';
import type { LibraryService } from '$lib/server/application/ports/inbound/notebook.service';

export async function PATCH({ params, request, locals }: RequestEvent): Promise<Response> {
	try {
		const { notebookId, cellId } = params;

		if (!notebookId || !cellId) {
			return json({ error: 'Notebook ID and Cell ID are required' }, { status: 400 });
		}

		const body = await request.json();
		const { kind, value, position } = body;

		// Access the injected libraryService
		const libraryService: LibraryService = locals.libraryService;

		// Get the notebook service
		const notebookService = await libraryService.getNotebookService(notebookId);
		if (notebookService === undefined) {
			return json({ error: 'Notebook not found' }, { status: 404 });
		}

		// If position is provided, this is a move operation
		if (position !== undefined) {
			await notebookService.moveCell(cellId, position);
			logger.info(`Moved cell ${cellId} to position ${position} in notebook ${notebookId}`);

			return json({
				message: 'Cell moved successfully',
				notebookId,
				cellId,
				position
			});
		}

		// Otherwise, this is an update operation
		if (kind === undefined && value === undefined) {
			return json({ error: 'Either kind, value, or position must be provided' }, { status: 400 });
		}

		await notebookService.updateCell(cellId, { kind, value });

		logger.info(`Updated cell ${cellId} in notebook ${notebookId}`);

		return json({
			message: 'Cell updated successfully',
			notebookId,
			cellId,
			updates: { kind, value }
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

		// Access the injected libraryService
		const libraryService: LibraryService = locals.libraryService;

		// Get the notebook service
		const notebookService = await libraryService.getNotebookService(notebookId);
		if (!notebookService) {
			return json({ error: 'Notebook not found' }, { status: 404 });
		}

		await notebookService.deleteCell(cellId);

		return json({
			message: 'Cell deleted successfully',
			notebookId,
			cellId
		});
	} catch (error) {
		logger.error('Error deleting cell:', error);
		return json({ error: 'Failed to delete cell', message: error }, { status: 500 });
	}
}
