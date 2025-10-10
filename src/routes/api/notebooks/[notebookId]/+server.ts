import { json } from '@sveltejs/kit';
import { logger } from '$lib/common/infrastructure/logging/logger.service';
import type { RequestEvent } from '@sveltejs/kit';
import { withProjection } from '$lib/server/application/middleware/projection-middleware';
import type { GetNotebookResponse, ApiError } from '$lib/types/api-contracts';

export async function GET({ params, locals }: RequestEvent): Promise<Response> {
	try {
		const { notebookId } = params;

		if (!notebookId) {
			const errorResponse: ApiError = { error: 'Notebook ID is required' };
			return json(errorResponse, { status: 400 });
		}

		// Access the injected libraryService
		const { libraryService } = locals;

		logger.info(`Getting notebook: ${notebookId}`);

		// Get the notebook metadata from the library
		const notebookMetadata = libraryService.getNotebook(notebookId);
		if (!notebookMetadata) {
			logger.error(`Notebook not found: ${notebookId}`);
			const errorResponse: ApiError = { error: 'Notebook not found' };
			return json(errorResponse, { status: 404 });
		}

		// Use projection middleware to get cells
		return withProjection(notebookId, locals.projectionManager, async (readModel) => {
			const cells = await readModel.getCells(notebookId);

			logger.info(`Notebook found: ${notebookId} with ${cells.length} cells`);

			// Return the complete notebook data including cells from read model
			const response: GetNotebookResponse = {
				id: notebookMetadata.id,
				title: notebookMetadata.title,
				description: notebookMetadata.description,
				createdAt: notebookMetadata.createdAt.toISOString(),
				updatedAt: notebookMetadata.updatedAt.toISOString(),
				cells: cells.map((cell) => ({
					id: cell.id,
					kind: cell.kind,
					value: cell.value,
					createdAt: cell.createdAt.toISOString(),
					updatedAt: cell.updatedAt.toISOString()
				}))
			};
			return json(response);
		});
	} catch (error) {
		logger.error('Error getting notebook:', error);
		const errorResponse: ApiError = { error: 'Failed to get notebook' };
		return json(errorResponse, { status: 500 });
	}
}
