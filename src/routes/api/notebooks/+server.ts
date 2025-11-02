import { json } from '@sveltejs/kit';
import { logger } from '$lib/common/infrastructure/logging/logger.service';
import type { RequestEvent } from '@sveltejs/kit';
import { requireAuthApi } from '$lib/server/application/middleware/auth-middleware';
import type {
	CreateNotebookRequest,
	CreateNotebookResponse,
	ListNotebooksResponse,
	ApiError
} from '$lib/types/api-contracts';

export async function GET(): Promise<Response> {
	try {
		// Access the injected libraryService
		// const { libraryService } = locals;

		// You can now use libraryService methods here
		// For example, you might want to get all notebooks from the library
		// const notebooks = Array.from(libraryService.library.values());

		const response: ListNotebooksResponse = { notebooks: [] };
		return json(response);
	} catch (error) {
		logger.error('Error getting notebooks:', error);
		const errorResponse: ApiError = { error: 'Failed to get notebooks' };
		return json(errorResponse, { status: 500 });
	}
}

export const POST = requireAuthApi(async ({ request, locals }: RequestEvent) => {
	try {
		const body: CreateNotebookRequest = await request.json();
		const { title, description, visibility } = body;

		if (!title) {
			const errorResponse: ApiError = { error: 'Title is required' };
			return json(errorResponse, { status: 400 });
		}

		// Validate visibility if provided
		if (visibility && visibility !== 'private' && visibility !== 'public') {
			const errorResponse: ApiError = { error: 'Visibility must be "private" or "public"' };
			return json(errorResponse, { status: 400 });
		}

		// User is guaranteed to be authenticated due to requireAuthApi middleware
		const user = locals.user!;
		logger.info(
			`User ${user.id} creating notebook: ${title} (visibility: ${visibility || 'private'})`
		);

		// Use the injected libraryService to create a notebook
		// Default to private for authenticated users if not specified
		const { libraryService } = locals;
		const [notebookId, eventId] = await libraryService.createNotebook(
			title,
			description,
			visibility || 'private',
			user.id
		);

		const response: CreateNotebookResponse = {
			id: notebookId,
			title,
			description,
			eventId,
			message: 'Notebook created successfully'
		};
		return json(response, { status: 201 });
	} catch (error) {
		logger.error('Error creating notebook:', error);
		const errorResponse: ApiError = { error: 'Failed to create notebook' };
		return json(errorResponse, { status: 500 });
	}
});
