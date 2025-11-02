import type { SearchNotebooksResponse } from '$lib/types/api-contracts';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

/**
 * Client-side service for searching notebooks
 */
export class NotebookSearchService {
	/**
	 * Search notebooks by title
	 * @param query - Search query string
	 * @param options - Optional search parameters
	 * @returns Promise with search results
	 */
	async search(
		query: string,
		options: {
			limit?: number;
			visibility?: 'private' | 'public' | 'all';
		} = {}
	): Promise<SearchNotebooksResponse> {
		const { limit = 20, visibility } = options;

		const params = new URLSearchParams({ q: query });
		if (limit !== 20) {
			params.set('limit', limit.toString());
		}
		if (visibility && visibility !== 'all') {
			params.set('visibility', visibility);
		}

		logger.debug(
			`NotebookSearchService: Searching with query="${query}", limit=${limit}, visibility=${visibility || 'all'}`
		);

		try {
			const response = await fetch(`/api/notebooks/search?${params.toString()}`);

			if (!response.ok) {
				const error = await response.json().catch(() => ({ error: 'Search failed' }));
				throw new Error(error.error || `Search failed: ${response.statusText}`);
			}

			const result = await response.json();
			logger.debug(`NotebookSearchService: Found ${result.count} notebooks`);
			return result;
		} catch (error) {
			logger.error('NotebookSearchService: Search error:', error);
			throw error;
		}
	}
}

// Export singleton instance
export const notebookSearchService = new NotebookSearchService();
