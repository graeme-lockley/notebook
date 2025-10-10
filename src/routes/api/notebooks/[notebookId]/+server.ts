import { json } from '@sveltejs/kit';
import { logger } from '$lib/common/infrastructure/logging/logger.service';
import type { RequestEvent } from '@sveltejs/kit';
import { withProjection } from '$lib/server/application/middleware/projection-middleware';

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

		// Use projection middleware to get cells
		return withProjection(notebookId, locals.projectionManager, async (readModel) => {
			const cells = await readModel.getCells(notebookId);

			logger.info(`Notebook found: ${notebookId} with ${cells.length} cells`);

			// Return the complete notebook data including cells from read model
			return json({
				id: notebookMetadata.id,
				title: notebookMetadata.title,
				description: notebookMetadata.description,
				createdAt: notebookMetadata.createdAt,
				updatedAt: notebookMetadata.updatedAt,
				cells: cells
			});
		});
	} catch (error) {
		logger.error('Error getting notebook:', error);
		return json({ error: 'Failed to get notebook' }, { status: 500 });
	}
}
