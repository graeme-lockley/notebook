import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

export async function GET({ cookies, locals }: RequestEvent) {
	logger.info('Auth me endpoint accessed');

	try {
		// Get the session service from locals
		const sessionService = locals.sessionService;
		if (!sessionService) {
			logger.error('Session service not available');
			return json({ error: 'Authentication service not available' }, { status: 500 });
		}

		// Get session ID from cookies
		const sessionId = cookies.get('session_id');
		if (!sessionId) {
			logger.debug('No session found');
			return json({ user: null });
		}

		// Validate session and get user
		const user = await sessionService.validateSession(sessionId);
		if (!user) {
			logger.debug('Invalid or expired session');
			return json({ user: null });
		}

		logger.info(`User ${user.id} authenticated`);
		return json({ user });
	} catch (error) {
		logger.error('Error in auth me endpoint:', error);
		return json({ error: 'Authentication failed' }, { status: 500 });
	}
}
