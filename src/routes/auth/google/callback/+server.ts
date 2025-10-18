import { json, redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

export async function GET({ url, cookies, locals }: RequestEvent) {
	logger.info('OAuth Google callback route accessed');

	try {
		// Get the OAuth route handler from locals
		const oauthRouteHandler = locals.oauthRouteHandler;
		if (!oauthRouteHandler) {
			logger.error('OAuth route handler not available');
			return json({ error: 'Authentication service not available' }, { status: 500 });
		}

		// Extract OAuth parameters from URL
		const code = url.searchParams.get('code');
		const state = url.searchParams.get('state');
		const error = url.searchParams.get('error');

		// Handle OAuth errors
		if (error) {
			logger.warn(`OAuth error: ${error}`);
			return redirect(302, `/auth/error?message=${encodeURIComponent(error)}`);
		}

		// Validate required parameters
		if (!code || !state) {
			logger.warn('Missing OAuth parameters: code or state');
			return redirect(302, '/auth/error?message=Missing authentication parameters');
		}

		const redirectUri = `${url.origin}/auth/google/callback`;

		// Handle the OAuth callback
		const result = await oauthRouteHandler.handleGoogleAuthCallback(
			code,
			state,
			redirectUri,
			cookies
		);

		// The OAuth route handler throws a redirect, so this won't be reached
		return result;
	} catch (error) {
		logger.error('Error in Google OAuth callback:', error);
		return redirect(302, `/auth/error?message=${encodeURIComponent((error as Error).message)}`);
	}
}
