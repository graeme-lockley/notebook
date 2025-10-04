import { json } from '@sveltejs/kit';
import { logger } from '$lib/server/infrastructure/logging/logger.service';
import type { RequestEvent } from '@sveltejs/kit';
import type { LibraryApplicationService } from '$lib/server/application/services/library-application-service';
import { AddCellCommandHandler } from '$lib/server/application/command-handlers/add-cell-command-handler';
import type { EventStore } from '$lib/server/application/ports/outbound/event-store';
import type { EventBus } from '$lib/server/application/ports/outbound/event-bus';

export async function POST({ params, request, locals }: RequestEvent): Promise<Response> {
	try {
		const { notebookId } = params;

		if (!notebookId) {
			return json({ error: 'Notebook ID is required' }, { status: 400 });
		}

		const body = await request.json();
		const { kind, value, position } = body;

		// Access the injected services
		const libraryService: LibraryApplicationService = locals.libraryService;
		const eventStore: EventStore = locals.eventStore;
		const eventBus: EventBus = locals.eventBus;

		// Check if notebook exists
		const notebook = libraryService.getNotebook(notebookId);
		if (!notebook) {
			return json({ error: 'Notebook not found' }, { status: 404 });
		}

		// Create command handler
		const commandHandler = new AddCellCommandHandler(eventStore, eventBus);

		// Execute command
		const result = await commandHandler.handle({
			notebookId,
			kind,
			value,
			position
		});

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
