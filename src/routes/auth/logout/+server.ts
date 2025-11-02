import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

export async function POST({ cookies, locals, url }: RequestEvent) {
	logger.info('Logout route accessed');

	try {
		// Get the OAuth route handler from locals
		const oauthRouteHandler = locals.oauthRouteHandler;
		if (!oauthRouteHandler) {
			logger.error('OAuth route handler not available');
			return redirect(302, '/auth/error?message=Authentication service not available');
		}

		// Get return URL from query params, or default to current page
		const returnUrl = url.searchParams.get('returnUrl') || '/';

		// Get session ID from cookies
		const sessionId = cookies.get('session_id');
		if (!sessionId) {
			logger.info('No session found, redirecting to return URL');
			return redirect(302, returnUrl);
		}

		// Handle logout
		await oauthRouteHandler.handleLogout(cookies);

		logger.info(`User logged out successfully, redirecting to: ${returnUrl}`);
		return redirect(302, returnUrl);
	} catch (error) {
		logger.error('Error during logout:', error);
		const returnUrl = url.searchParams.get('returnUrl') || '/';
		return redirect(
			302,
			`/auth/error?message=${encodeURIComponent((error as Error).message)}&returnUrl=${encodeURIComponent(returnUrl)}`
		);
	}
}
