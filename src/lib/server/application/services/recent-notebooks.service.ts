import { logger } from '$lib/common/infrastructure/logging/logger.service';
import type { UserNotebookViewReadModel } from '../ports/inbound/user-notebook-view-read-model';
import type { LibraryReadModel } from '../ports/inbound/read-models';

/**
 * Notebook summary type for recent notebooks display
 */
export interface RecentNotebookSummary {
	id: string;
	title: string;
	description?: string;
}

/**
 * Service for fetching recent notebooks for authenticated users
 * Consolidates logic that was duplicated between home page and debug endpoint
 */
export class RecentNotebooksService {
	constructor(
		private userNotebookViewReadModel: UserNotebookViewReadModel,
		private libraryReadModel: LibraryReadModel
	) {}

	/**
	 * Get recent notebooks for a user with metadata
	 * @param userId - User ID
	 * @param limit - Maximum number of notebooks to return
	 * @returns Array of notebook summaries with id, title, and description
	 */
	async getRecentNotebooks(userId: string, limit: number = 5): Promise<RecentNotebookSummary[]> {
		logger.info(`RecentNotebooksService: Fetching ${limit} recent notebooks for user ${userId}`);

		try {
			// Get recent notebook IDs
			const recentNotebookIds = await this.userNotebookViewReadModel.getRecentNotebookIds(
				userId,
				limit
			);

			logger.debug(`RecentNotebooksService: Found ${recentNotebookIds.length} recent notebook IDs`);

			// Fetch notebook metadata for each ID
			const notebooks: RecentNotebookSummary[] = [];
			for (const notebookId of recentNotebookIds) {
				const notebook = await this.libraryReadModel.getNotebook(notebookId);
				if (notebook) {
					notebooks.push({
						id: notebook.id,
						title: notebook.title,
						description: notebook.description
					});
					logger.debug(`RecentNotebooksService: Loaded notebook ${notebookId}: ${notebook.title}`);
				} else {
					logger.warn(`RecentNotebooksService: Notebook ${notebookId} not found in library`);
				}
			}

			logger.info(
				`RecentNotebooksService: Successfully loaded ${notebooks.length} recent notebooks with metadata`
			);

			return notebooks;
		} catch (error) {
			logger.error('RecentNotebooksService: Error fetching recent notebooks:', error);
			throw error;
		}
	}
}
