import { json } from '@sveltejs/kit';
import { logger } from '$lib/server/infrastructure/logging/logger.service';
import type { RequestEvent } from '@sveltejs/kit';
import type { NotebookApplicationService } from '$lib/server/application/services/notebook-application-service';

export async function POST({ params, request, locals }: RequestEvent): Promise<Response> {
	try {
		const { notebookId } = params;

		if (!notebookId) {
			return json({ error: 'Notebook ID is required' }, { status: 400 });
		}

		const body = await request.json();
		const { kind, value, position } = body;

		// Access the injected notebookService
		const notebookService: NotebookApplicationService = locals.notebookService;

		// Add the cell via the application service (this will publish events and broadcast)
		await notebookService.addCell(notebookId, kind, value, position);

		logger.info(`Added ${kind} cell to notebook ${notebookId} at position ${position}`);

		return json(
			{
				message: 'Cell added successfully',
				notebookId,
				kind,
				position
			},
			{ status: 201 }
		);
	} catch (error) {
		logger.error('Error adding cell:', error);
		return json({ error: 'Failed to add cell' }, { status: 500 });
	}
}
