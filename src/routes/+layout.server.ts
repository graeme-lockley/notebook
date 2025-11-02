import type { LayoutServerLoad } from './$types';
import { logger } from '$lib/common/infrastructure/logging/logger.service';
import { getAuthContext } from '$lib/server/utils/auth-helpers';

export const load: LayoutServerLoad = async ({ locals }) => {
	logger.debug('Layout server load: Checking authentication state');

	// Get authentication context from middleware
	const auth = getAuthContext(locals);
	const { user, isAuthenticated, sessionId } = auth;

	logger.debug(`Layout server load: User ${user?.id || 'null'}, authenticated: ${isAuthenticated}`);

	// Serialize user if present (convert Date objects to ISO strings for client)
	const serializedUser = locals.userSerializationService.serializeForClient(user);

	logger.debug(`Layout server load: User picture: ${user?.picture || 'none'}`);

	return {
		user: serializedUser,
		isAuthenticated,
		sessionId
	};
};
