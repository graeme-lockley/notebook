import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

export async function POST({ cookies, locals }: RequestEvent) {
	logger.info('Logout route accessed');

	try {
		// Get the OAuth route handler from locals
		const oauthRouteHandler = locals.oauthRouteHandler;
		if (!oauthRouteHandler) {
			logger.error('OAuth route handler not available');
			return redirect(302, '/auth/error?message=Authentication service not available');
		}

		// Get session ID from cookies
		const sessionId = cookies.get('session_id');
		if (!sessionId) {
			logger.info('No session found, redirecting to home');
			return redirect(302, '/');
		}

		// Handle logout
		await oauthRouteHandler.handleLogout(cookies);

		logger.info('User logged out successfully');
		return redirect(302, '/');
	} catch (error) {
		logger.error('Error during logout:', error);
		return redirect(302, `/auth/error?message=${encodeURIComponent((error as Error).message)}`);
	}
}
