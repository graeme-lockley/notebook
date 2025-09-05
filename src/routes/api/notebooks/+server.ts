import { json } from '@sveltejs/kit';
import { logger } from '$lib/server/infrastructure/logging/logger.service';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET(): Promise<Response> {
	try {
		// Access the injected libraryService
		// const { libraryService } = locals;

		// You can now use libraryService methods here
		// For example, you might want to get all notebooks from the library
		// const notebooks = Array.from(libraryService.library.values());

		return json([]);
	} catch (error) {
		logger.error('Error getting notebooks:', error);
		return json({ error: 'Failed to get notebooks' }, { status: 500 });
	}
}

export async function POST({ request, locals }: RequestEvent): Promise<Response> {
	try {
		const body = await request.json();
		const { title, description } = body;

		if (!title) {
			return json({ error: 'Title is required' }, { status: 400 });
		}

		// Use the injected libraryService to create a notebook
		const { libraryService } = locals;
		const [notebookId, eventId] = await libraryService.createNotebook(title, description);

		return json(
			{
				id: notebookId,
				title,
				description,
				eventId,
				message: 'Notebook created successfully'
			},
			{ status: 201 }
		);
	} catch (error) {
		logger.error('Error creating notebook:', error);
		return json({ error: 'Failed to create notebook' }, { status: 500 });
	}
}
