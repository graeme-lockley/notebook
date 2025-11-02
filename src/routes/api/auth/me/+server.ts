import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { withAuth } from '$lib/server/application/middleware/auth-middleware';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

export const GET = withAuth(async ({ locals }: RequestEvent) => {
	logger.info('Auth me endpoint accessed');

	// User context is already available in locals.user from middleware
	const user = locals.user;

	if (user) {
		logger.info(`User ${user.id} authenticated`);
		return json({ user });
	} else {
		logger.debug('No authenticated user');
		return json({ user: null });
	}
});
