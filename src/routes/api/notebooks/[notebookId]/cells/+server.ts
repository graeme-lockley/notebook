import { json } from '@sveltejs/kit';
import { logger } from '$lib/common/infrastructure/logging/logger.service';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST({ params, request, locals }: RequestEvent): Promise<Response> {
	try {
		const { notebookId } = params;

		if (!notebookId) {
			return json({ error: 'Notebook ID is required' }, { status: 400 });
		}

		const body = await request.json();
		const { kind, value, position } = body;

		// Check if notebook exists
		const notebook = locals.libraryService.getNotebook(notebookId);
		if (!notebook) {
			return json({ error: 'Notebook not found' }, { status: 404 });
		}

		// Execute command via service
		const result = await locals.notebookCommandService.addCell(notebookId, kind, value, position);

		logger.info(`Added ${kind} cell to notebook ${notebookId} at position ${position}`);

		return json(
			{
				message: 'Cell added successfully',
				notebookId,
				cellId: result.cellId,
				eventId: result.eventId,
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
