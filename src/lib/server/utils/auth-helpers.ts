import type { AuthContext } from '../application/middleware/auth-middleware';

// Import App.Locals type from SvelteKit
type AppLocals = import('@sveltejs/kit').RequestEvent['locals'];

/**
 * Extracts authentication context from SvelteKit locals
 * Consolidates the repeated pattern across route handlers
 */
export function getAuthContext(locals: AppLocals): AuthContext {
	return {
		user: locals.user || null,
		isAuthenticated: locals.isAuthenticated || false,
		sessionId: locals.sessionId || null
	};
}
