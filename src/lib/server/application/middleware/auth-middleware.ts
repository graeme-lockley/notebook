import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { SessionService } from '../services/session.service';
import type { User } from '$lib/server/domain/value-objects';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

export interface AuthContext {
	user: User | null;
	isAuthenticated: boolean;
	sessionId: string | null;
}

export interface AuthMiddlewareOptions {
	/**
	 * Whether authentication is required for this route
	 * @default false
	 */
	requireAuth?: boolean;

	/**
	 * Redirect URL for unauthenticated users
	 * @default '/auth/google'
	 */
	redirectTo?: string;

	/**
	 * Whether to redirect or return 401 for unauthenticated users
	 * @default true (redirect)
	 */
	redirectOnAuthFailure?: boolean;
}

/**
 * Authentication middleware that validates sessions and injects user context
 */
export class AuthMiddleware {
	constructor(private sessionService: SessionService) {}

	/**
	 * Process authentication for a request
	 */
	async processRequest(
		event: RequestEvent,
		options: AuthMiddlewareOptions = {}
	): Promise<AuthContext> {
		const {
			requireAuth = false,
			redirectTo = '/auth/google',
			redirectOnAuthFailure = true
		} = options;

		logger.debug(`AuthMiddleware: Processing request for ${event.url.pathname}`);

		// Get session ID from cookies
		const sessionId = event.cookies.get('session_id');
		let user: User | null = null;
		let isAuthenticated = false;

		if (sessionId) {
			try {
				// Validate session and get user
				user = await this.sessionService.validateSession(sessionId);
				isAuthenticated = user !== null;

				if (isAuthenticated && user) {
					logger.debug(`AuthMiddleware: User ${user.id} authenticated for ${event.url.pathname}`);
				} else {
					logger.debug(`AuthMiddleware: Invalid session ${sessionId} for ${event.url.pathname}`);
				}
			} catch (error) {
				logger.error(`AuthMiddleware: Error validating session ${sessionId}:`, error);
				isAuthenticated = false;
			}
		} else {
			logger.debug(`AuthMiddleware: No session found for ${event.url.pathname}`);
		}

		// Check if authentication is required
		if (requireAuth && !isAuthenticated) {
			logger.info(
				`AuthMiddleware: Authentication required for ${event.url.pathname}, redirecting to ${redirectTo}`
			);

			if (redirectOnAuthFailure) {
				throw redirect(302, redirectTo);
			} else {
				throw new Error('Authentication required');
			}
		}

		return {
			user,
			isAuthenticated,
			sessionId: sessionId || null
		};
	}

	/**
	 * Helper function to check if user has specific permissions
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	hasPermission(user: User | null, permission: string): boolean {
		if (!user) return false;
		// For now, all authenticated users have all permissions
		// This can be extended later with role-based permissions
		// TODO: Implement permission checking based on permission parameter
		return true;
	}

	/**
	 * Helper function to check if user owns a resource
	 */
	ownsResource(user: User | null, resourceOwnerId: string): boolean {
		if (!user) return false;
		return user.id === resourceOwnerId;
	}
}

/**
 * Higher-order function to wrap route handlers with authentication
 */
export function withAuth(
	handler: (event: RequestEvent, auth: AuthContext) => Promise<Response> | Response,
	options: AuthMiddlewareOptions = {}
) {
	return async (event: RequestEvent): Promise<Response> => {
		const sessionService = event.locals.sessionService;
		if (!sessionService) {
			logger.error('AuthMiddleware: Session service not available');
			throw new Error('Authentication service not available');
		}

		const authMiddleware = new AuthMiddleware(sessionService);
		const auth = await authMiddleware.processRequest(event, options);

		// Inject auth context into event.locals
		event.locals.user = auth.user;
		event.locals.isAuthenticated = auth.isAuthenticated;
		event.locals.sessionId = auth.sessionId;

		return handler(event, auth);
	};
}

/**
 * Higher-order function for routes that require authentication
 */
export function requireAuth(
	handler: (event: RequestEvent, auth: AuthContext) => Promise<Response> | Response,
	options: Omit<AuthMiddlewareOptions, 'requireAuth'> = {}
) {
	return withAuth(handler, { ...options, requireAuth: true });
}

/**
 * Higher-order function for API routes that return 401 instead of redirecting
 */
export function requireAuthApi(
	handler: (event: RequestEvent, auth: AuthContext) => Promise<Response> | Response,
	options: Omit<AuthMiddlewareOptions, 'requireAuth' | 'redirectOnAuthFailure'> = {}
) {
	return withAuth(handler, { ...options, requireAuth: true, redirectOnAuthFailure: false });
}
