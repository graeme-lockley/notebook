import { json, isRedirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

export async function GET({ url, cookies, locals, request }: RequestEvent) {
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

		// Store the return URL (where to redirect after login) in a cookie
		const returnUrlParam = url.searchParams.get('returnUrl');
		const referer = request.headers.get('referer');
		const returnUrl = returnUrlParam || referer || '/';
		cookies.set('oauth_return_url', returnUrl, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 10, // 10 minutes
			path: '/'
		});
		logger.debug(`Storing return URL: ${returnUrl}`);

		// Log the redirect URI for debugging (to verify it matches Google Cloud Console)
		logger.info(`Using redirect URI: ${redirectUri}`);
		logger.info(`Current URL origin: ${url.origin}`);

		// Handle the OAuth redirect (this will throw a redirect)
		oauthRouteHandler.handleGoogleAuthRedirect(state, redirectUri, cookies);

		// This should never be reached since handleGoogleAuthRedirect throws a redirect
		return json({ error: 'Unexpected error' }, { status: 500 });
	} catch (error) {
		// In SvelteKit, redirect() throws a special error that must be re-thrown
		// Check if this is a redirect error and allow it to propagate
		if (isRedirect(error)) {
			throw error; // Re-throw redirect errors so SvelteKit can handle them
		}

		// Log and handle actual errors
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
