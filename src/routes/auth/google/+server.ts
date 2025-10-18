import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

export async function GET({ url, cookies, locals }: RequestEvent) {
	logger.info('OAuth Google redirect route accessed');

	try {
		// Get the OAuth route handler from locals
		const oauthRouteHandler = locals.oauthRouteHandler;
		if (!oauthRouteHandler) {
			logger.error('OAuth route handler not available');
			return json({ error: 'Authentication service not available' }, { status: 500 });
		}

		// Generate a random state parameter for CSRF protection
		const state = generateRandomState();
		const redirectUri = `${url.origin}/auth/google/callback`;

		// Handle the OAuth redirect
		const result = oauthRouteHandler.handleGoogleAuthRedirect(state, redirectUri, cookies);

		// The OAuth route handler throws a redirect, so this won't be reached
		return result;
	} catch (error) {
		logger.error('Error in Google OAuth redirect:', error);
		return json({ error: 'Authentication failed' }, { status: 500 });
	}
}

function generateRandomState(): string {
	// Generate a cryptographically secure random state
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
