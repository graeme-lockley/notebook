import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { logger } from '$lib/common/infrastructure/logging/logger.service';
import { getAuthContext } from '$lib/server/utils/auth-helpers';
import { DEBUG_RECENT_NOTEBOOKS_LIMIT } from '$lib/server/constants/recent-notebooks';

/**
 * Debug endpoint to check recent notebooks functionality
 * Access at /api/debug/recent-notebooks
 */
export async function GET({ locals }: RequestEvent): Promise<Response> {
	const auth = getAuthContext(locals);
	const { user, isAuthenticated } = auth;

	logger.info('=== Debug: Recent notebooks endpoint accessed ===');
	logger.info(`Debug: User ID: ${user?.id || 'null'}`);
	logger.info(`Debug: User Email: ${user?.email || 'null'}`);
	logger.info(`Debug: Authenticated: ${isAuthenticated}`);
	logger.info(`Debug: recentNotebooksService available: ${!!locals.recentNotebooksService}`);

	if (!isAuthenticated || !user) {
		return json({
			error: 'Not authenticated',
			user: null,
			isAuthenticated: false,
			message: 'Please log in to see recent notebooks'
		});
	}

	try {
		const notebooks = await locals.recentNotebooksService.getRecentNotebooks(
			user.id,
			DEBUG_RECENT_NOTEBOOKS_LIMIT
		);

		return json({
			user: { id: user.id, email: user.email },
			isAuthenticated: true,
			notebooks,
			count: notebooks.length,
			message:
				notebooks.length > 0
					? 'Recent notebooks found'
					: 'No recent notebooks - visit a notebook to track views'
		});
	} catch (error) {
		logger.error('Debug: Error getting recent notebooks:', error);
		return json(
			{
				error: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined,
				user: { id: user.id, email: user.email },
				isAuthenticated: true
			},
			{ status: 500 }
		);
	}
}
