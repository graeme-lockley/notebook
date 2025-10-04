import { json } from '@sveltejs/kit';
import { logger } from '$lib/server/infrastructure/logging/logger.service';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET({ params, locals }: RequestEvent): Promise<Response> {
	try {
		const { notebookId } = params;

		if (!notebookId) {
			return json({ error: 'Notebook ID is required' }, { status: 400 });
		}

		// Access the injected libraryService
		const { libraryService } = locals;

		logger.info(`Getting notebook: ${notebookId}`);

		// Get the notebook metadata from the library
		const notebookMetadata = libraryService.getNotebook(notebookId);
		if (!notebookMetadata) {
			logger.error(`Notebook not found: ${notebookId}`);
			return json({ error: 'Notebook not found' }, { status: 404 });
		}

		// Get the notebook service to access cells
		const { notebookService } = locals;
		const notebookServiceInstance = await notebookService.getNotebookService(notebookId);

		logger.info(`Notebook found: ${notebookId} with ${notebookServiceInstance.cells.length} cells`);

		// Return the complete notebook data including cells
		return json({
			id: notebookMetadata.id,
			title: notebookMetadata.title,
			description: notebookMetadata.description,
			createdAt: notebookMetadata.createdAt,
			updatedAt: notebookMetadata.updatedAt,
			cells: notebookServiceInstance.cells
		});
	} catch (error) {
		logger.error('Error getting notebook:', error);
		return json({ error: 'Failed to get notebook' }, { status: 500 });
	}
}
