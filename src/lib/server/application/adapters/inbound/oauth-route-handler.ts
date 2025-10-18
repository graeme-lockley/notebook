import type { AuthenticationService } from '../../services/authentication.service';
import type { SessionService } from '../../services/session.service';
import type { AuthProvider } from '$lib/server/domain/value-objects';
import type { Cookies } from '@sveltejs/kit';
import { logger } from '$lib/common/infrastructure/logging/logger.service';
import { redirect } from '@sveltejs/kit';

export interface OAuthCallbackResult {
	redirectTo: string;
	sessionId: string;
}

export class OAuthRouteHandler {
	constructor(
		private authService: AuthenticationService,
		private sessionService: SessionService
	) {}

	async handleOAuthCallback(
		provider: AuthProvider,
		code: string,
		state: string,
		redirectUri: string,
		cookies: Cookies
	): Promise<OAuthCallbackResult> {
		logger.info(`OAuthRouteHandler: Handling OAuth callback for ${provider}`);

		// 1. Validate state parameter (basic validation - should match stored state)
		if (!state || state.trim() === '') {
			throw new Error('Invalid state parameter');
		}

		// 2. Authenticate user
		const { user, isNewUser } = await this.authService.authenticateUser(
			provider,
			code,
			redirectUri
		);

		logger.info(`OAuthRouteHandler: User authenticated: ${user.id}, isNewUser: ${isNewUser}`);

		// 3. Create session
		const sessionId = await this.sessionService.createSession(user.id);

		// 4. Set session cookie
		this.setSessionCookie(cookies, sessionId);

		// 5. Determine redirect destination
		const redirectTo = isNewUser ? '/' : '/'; // Can add onboarding later

		logger.info(`OAuthRouteHandler: OAuth flow complete, redirecting to ${redirectTo}`);

		return { redirectTo, sessionId };
	}

	private setSessionCookie(cookies: Cookies, sessionId: string): void {
		cookies.set('session_id', sessionId, {
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7 // 7 days
		});
	}

	handleGoogleAuthRedirect(state: string, redirectUri: string, cookies: Cookies): Response {
		logger.info('OAuthRouteHandler: Handling Google auth redirect');

		// Store the state in a secure, httpOnly cookie
		cookies.set('oauth_state', state, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 10, // 10 minutes
			path: '/'
		});

		const authorizationUrl = this.authService.getAuthorizationUrl('google', state, redirectUri);
		throw redirect(302, authorizationUrl);
	}

	async handleGoogleAuthCallback(
		code: string,
		state: string,
		redirectUri: string,
		cookies: Cookies
	): Promise<Response> {
		logger.info('OAuthRouteHandler: Handling Google auth callback');

		const storedState = cookies.get('oauth_state');
		cookies.delete('oauth_state', { path: '/' }); // Clear the state cookie immediately

		if (!storedState || storedState !== state) {
			logger.warn('OAuthRouteHandler: State mismatch or missing state cookie');
			throw redirect(302, '/auth/error?message=State mismatch or missing');
		}

		try {
			const { user, isNewUser } = await this.authService.authenticateUser(
				'google',
				code,
				redirectUri
			);

			// Create session
			const sessionId = await this.sessionService.createSession(user.id);

			// Set session cookie
			cookies.set('session_id', sessionId, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				maxAge: 60 * 60 * 24 * 7, // 7 days
				path: '/'
			});

			logger.info(
				`OAuthRouteHandler: User ${user.id} authenticated. New user: ${isNewUser}. Session ID: ${sessionId}`
			);
			throw redirect(302, '/'); // Redirect to home page or dashboard
		} catch (error) {
			logger.error(`OAuthRouteHandler: Authentication failed: ${error}`);
			throw redirect(302, `/auth/error?message=${(error as Error).message}`);
		}
	}

	async handleLogout(cookies: Cookies): Promise<void> {
		const sessionId = cookies.get('session_id');

		if (sessionId) {
			await this.sessionService.invalidateSession(sessionId);
		}

		cookies.delete('session_id', { path: '/' });
		logger.info('OAuthRouteHandler: User logged out');
	}
}
