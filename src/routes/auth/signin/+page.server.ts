import type { PageServerLoad } from './$types';
import { logger } from '$lib/common/infrastructure/logging/logger.service';
import { getAuthContext } from '$lib/server/utils/auth-helpers';

export const load: PageServerLoad = async ({ locals }) => {
	logger.debug('Signin page server load: Checking authentication state');

	// Get authentication context from middleware
	const auth = getAuthContext(locals);
	const { user, isAuthenticated, sessionId } = auth;

	logger.debug(`Signin page: User ${user?.id || 'null'}, authenticated: ${isAuthenticated}`);

	return {
		user,
		isAuthenticated,
		sessionId
	};
};
