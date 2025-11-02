import type { PageServerLoad } from './$types';
import { logger } from '$lib/common/infrastructure/logging/logger.service';
import { getAuthContext } from '$lib/server/utils/auth-helpers';
import { DEFAULT_RECENT_NOTEBOOKS_LIMIT } from '$lib/server/constants/recent-notebooks';

export const load: PageServerLoad = async ({ locals }) => {
	logger.debug('Home page server load: Checking authentication state');

	// Get authentication context from middleware
	const auth = getAuthContext(locals);
	const { user, isAuthenticated, sessionId } = auth;

	logger.debug(`Home page: User ${user?.id || 'null'}, authenticated: ${isAuthenticated}`);

	// Get recent notebooks if user is authenticated
	let recentNotebooks: Array<{ id: string; title: string; description?: string }> = [];
	if (isAuthenticated && user) {
		try {
			recentNotebooks = await locals.recentNotebooksService.getRecentNotebooks(
				user.id,
				DEFAULT_RECENT_NOTEBOOKS_LIMIT
			);
		} catch (error) {
			logger.error('Home page: Failed to load recent notebooks:', error);
			// Continue with empty array - don't fail page load
		}
	} else {
		logger.debug('Home page: User not authenticated, skipping recent notebooks');
	}

	// Serialize user if present
	const serializedUser = locals.userSerializationService.serializeForClient(user);

	return {
		user: serializedUser,
		isAuthenticated,
		sessionId,
		recentNotebooks
	};
};
