import { json, redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { logger } from '$lib/common/infrastructure/logging/logger.service';
import { handleAuthError, serializeError } from '$lib/server/utils/error-helpers';

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
			throw redirect(302, `/auth/error?message=${encodeURIComponent(error)}`);
		}

		// Validate required parameters
		if (!code || !state) {
			logger.warn('Missing OAuth parameters: code or state');
			throw redirect(302, '/auth/error?message=Missing authentication parameters');
		}

		const redirectUri = `${url.origin}/auth/google/callback`;

		// Handle the OAuth callback (this may throw a redirect)
		await oauthRouteHandler.handleGoogleAuthCallback(code, state, redirectUri, cookies);

		// This should never be reached since handleGoogleAuthCallback throws a redirect
		return json({ error: 'Unexpected error' }, { status: 500 });
	} catch (error) {
		// Serialize error for logging
		const errorInfo = serializeError(error);
		logger.error('Error in Google OAuth callback:', {
			message: errorInfo.message,
			stack: errorInfo.stack,
			error: errorInfo.details,
			type: errorInfo.type
		});

		// Handle redirect errors properly
		handleAuthError(error, 'Authentication failed');
	}
}
