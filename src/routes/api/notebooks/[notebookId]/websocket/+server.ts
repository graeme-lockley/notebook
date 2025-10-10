import { json } from '@sveltejs/kit';
import { logger } from '$lib/common/infrastructure/logging/logger.service';
import type { RequestEvent } from '@sveltejs/kit';
import type { LibraryApplicationService } from '$lib/server/application/services/library-application-service';
import { withProjection } from '$lib/server/application/middleware/projection-middleware';

export async function GET({ params, locals }: RequestEvent): Promise<Response> {
	try {
		const { notebookId } = params;

		if (!notebookId) {
			return json({ error: 'Notebook ID is required' }, { status: 400 });
		}

		// Access the injected services
		const libraryService: LibraryApplicationService = locals.libraryService;

		// Check if notebook exists
		const notebook = libraryService.getNotebook(notebookId);
		if (!notebook) {
			return json({ error: 'Notebook not found' }, { status: 404 });
		}

		// Use projection middleware to get initial state
		return withProjection(notebookId, locals.projectionManager, async (readModel) => {
			const cells = await readModel.getCells(notebookId);

			// For regular GET requests, return connection info with initial state
			return json({
				notebookId,
				websocketUrl: `ws://localhost:3001/api/notebooks/${notebookId}/websocket`,
				message: 'Connect to WebSocket URL for real-time updates',
				initialState: {
					notebook,
					cells
				}
			});
		});
	} catch (error) {
		logger.error('Error in WebSocket endpoint:', error);
		return json({ error: 'Failed to handle WebSocket request' }, { status: 500 });
	}
}
