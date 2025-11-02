import type { UserId } from '$lib/server/domain/value-objects';

export interface NotebookView {
	notebookId: string;
	userId: UserId;
	viewedAt: Date;
}

/**
 * Read model interface for tracking user notebook views.
 * Used to display recently viewed notebooks.
 */
export interface UserNotebookViewReadModel {
	/**
	 * Get recent notebooks viewed by a user, ordered by most recent first.
	 * @param userId - The user ID
	 * @param limit - Maximum number of notebooks to return (default: 10)
	 * @returns Array of notebook IDs, most recent first
	 */
	getRecentNotebookIds(userId: UserId, limit?: number): Promise<string[]>;

	/**
	 * Record a notebook view for a user.
	 * Called by projector when processing notebook.viewed events.
	 */
	recordView(notebookId: string, userId: UserId, viewedAt: Date): void;
}
