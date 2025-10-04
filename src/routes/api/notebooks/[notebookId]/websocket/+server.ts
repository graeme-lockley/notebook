import { json } from '@sveltejs/kit';
import { logger } from '$lib/server/infrastructure/logging/logger.service';
import type { RequestEvent } from '@sveltejs/kit';
import type { LibraryApplicationService } from '$lib/server/application/services/library-application-service';
import type { NotebookReadModel } from '$lib/server/application/ports/inbound/read-models';

export async function GET({ params, locals }: RequestEvent): Promise<Response> {
	try {
		const { notebookId } = params;

		if (!notebookId) {
			return json({ error: 'Notebook ID is required' }, { status: 400 });
		}

		// Access the injected services
		const libraryService: LibraryApplicationService = locals.libraryService;
		const notebookReadModel: NotebookReadModel = locals.notebookReadModel;

		// Check if notebook exists
		const notebook = libraryService.getNotebook(notebookId);
		if (!notebook) {
			return json({ error: 'Notebook not found' }, { status: 404 });
		}

		// For regular GET requests, return connection info
		return json({
			notebookId,
			websocketUrl: `ws://localhost:3001/api/notebooks/${notebookId}/websocket`,
			message: 'Connect to WebSocket URL for real-time updates',
			initialState: notebookReadModel.getNotebook(notebookId)
		});
	} catch (error) {
		logger.error('Error in WebSocket endpoint:', error);
		return json({ error: 'Failed to handle WebSocket request' }, { status: 500 });
	}
}
