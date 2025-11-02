import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { logger } from '$lib/common/infrastructure/logging/logger.service';
import type { SearchNotebooksResponse, ApiError } from '$lib/types/api-contracts';

/**
 * GET /api/notebooks/search
 * Search notebooks by title with optional visibility filtering
 *
 * Query parameters:
 * - q: Search query string (required)
 * - limit: Maximum results (optional, default: 20)
 * - visibility: Filter by visibility - 'private', 'public', 'protected', or 'all' (optional)
 */
export async function GET({ url, locals }: RequestEvent): Promise<Response> {
	try {
		const query = url.searchParams.get('q') || '';
		const limitParam = url.searchParams.get('limit');
		const limit = limitParam ? parseInt(limitParam, 10) : 20;
		const visibilityParam = url.searchParams.get('visibility') as
			| 'private'
			| 'public'
			| 'protected'
			| 'all'
			| null;

		logger.info(
			`Search API: query="${query}", limit=${limit}, visibility=${visibilityParam || 'all'}`
		);

		// Validate query
		if (!query || query.trim() === '') {
			const response: SearchNotebooksResponse = {
				notebooks: [],
				count: 0
			};
			return json(response);
		}

		// Validate limit
		if (limit < 1 || limit > 100) {
			const errorResponse: ApiError = {
				error: 'Limit must be between 1 and 100'
			};
			return json(errorResponse, { status: 400 });
		}

		// Validate visibility
		if (visibilityParam && !['private', 'public', 'protected', 'all'].includes(visibilityParam)) {
			const errorResponse: ApiError = {
				error: "Visibility must be 'private', 'public', 'protected', or 'all'"
			};
			return json(errorResponse, { status: 400 });
		}

		// Get user context for privacy filtering
		const userId = locals.user?.id || null;

		// Determine visibility filter
		let visibility: 'private' | 'public' | 'protected' | undefined = undefined;
		if (
			visibilityParam === 'private' ||
			visibilityParam === 'public' ||
			visibilityParam === 'protected'
		) {
			visibility = visibilityParam;
		}

		// Search notebooks
		const notebooks = await locals.libraryReadModel.searchNotebooks(query, visibility, userId);

		// Limit results
		const limited = notebooks.slice(0, limit);

		// Convert to API format
		const response: SearchNotebooksResponse = {
			notebooks: limited.map((nb) => ({
				id: nb.id,
				title: nb.title,
				description: nb.description,
				createdAt: nb.createdAt.toISOString(),
				updatedAt: nb.updatedAt.toISOString()
			})),
			count: limited.length
		};

		logger.info(`Search API: Found ${response.count} notebooks for query "${query}"`);
		return json(response);
	} catch (error) {
		logger.error('Search API: Error searching notebooks:', error);
		const errorResponse: ApiError = {
			error: 'Search failed',
			message: error instanceof Error ? error.message : 'Unknown error'
		};
		return json(errorResponse, { status: 500 });
	}
}
