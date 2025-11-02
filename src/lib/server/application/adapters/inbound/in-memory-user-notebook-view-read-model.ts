import type { UserNotebookViewReadModel } from '../../ports/inbound/user-notebook-view-read-model';
import type { UserId } from '$lib/server/domain/value-objects';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

interface NotebookView {
	notebookId: string;
	userId: UserId;
	viewedAt: Date;
}

/**
 * In-memory implementation of UserNotebookViewReadModel.
 * Tracks notebook views per user, ordered by most recent.
 */
export class InMemoryUserNotebookViewReadModel implements UserNotebookViewReadModel {
	// Map of userId -> array of views (most recent first)
	private userViews = new Map<UserId, NotebookView[]>();

	async getRecentNotebookIds(userId: UserId, limit: number = 10): Promise<string[]> {
		logger.info(
			`UserNotebookViewReadModel: getRecentNotebookIds called for user ${userId}, limit ${limit}`
		);
		logger.info(`UserNotebookViewReadModel: Total users tracked: ${this.userViews.size}`);

		const views = this.userViews.get(userId) || [];
		logger.info(`UserNotebookViewReadModel: Found ${views.length} views for user ${userId}`);

		if (views.length > 0) {
			logger.info(
				`UserNotebookViewReadModel: First view: ${views[0].notebookId} at ${views[0].viewedAt.toISOString()}`
			);
			logger.info(
				`UserNotebookViewReadModel: Last view: ${views[views.length - 1].notebookId} at ${views[views.length - 1].viewedAt.toISOString()}`
			);
		}

		// Get unique notebook IDs, preserving order (most recent first)
		const uniqueNotebookIds: string[] = [];
		const seen = new Set<string>();

		for (const view of views) {
			if (!seen.has(view.notebookId)) {
				uniqueNotebookIds.push(view.notebookId);
				seen.add(view.notebookId);
			}
		}

		const result = uniqueNotebookIds.slice(0, limit);
		logger.info(
			`UserNotebookViewReadModel: getRecentNotebookIds(${userId}, ${limit}): returning ${result.length} notebooks: ${JSON.stringify(result)}`
		);
		return result;
	}

	recordView(notebookId: string, userId: UserId, viewedAt: Date): void {
		logger.info(
			`UserNotebookViewReadModel: Recording view - notebookId: ${notebookId}, userId: ${userId}, viewedAt: ${viewedAt.toISOString()}`
		);

		if (!this.userViews.has(userId)) {
			this.userViews.set(userId, []);
			logger.info(`UserNotebookViewReadModel: Created new view history for user ${userId}`);
		}

		const views = this.userViews.get(userId)!;

		// Remove any existing view for this notebook to avoid duplicates
		const filtered = views.filter((v) => v.notebookId !== notebookId);
		logger.debug(
			`UserNotebookViewReadModel: After filtering duplicates, ${filtered.length} views remain`
		);

		// Add new view at the beginning (most recent first)
		filtered.unshift({
			notebookId,
			userId,
			viewedAt
		});

		// Keep only the most recent 50 views per user (to prevent memory bloat)
		if (filtered.length > 50) {
			filtered.splice(50);
		}

		this.userViews.set(userId, filtered);
		logger.info(
			`UserNotebookViewReadModel: recordView(${notebookId}, ${userId}): recorded at ${viewedAt.toISOString()}, total views for user: ${filtered.length}`
		);
	}
}
