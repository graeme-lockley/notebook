import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OAuthRouteHandler } from './oauth-route-handler';
import type { AuthenticationService } from '../../services/authentication.service';
import type { SessionService } from '../../services/session.service';
import type { User } from '$lib/server/domain/value-objects';
import type { Cookies } from '@sveltejs/kit';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

// Mock the logger to test logging behavior
vi.mock('$lib/common/infrastructure/logging/logger.service', () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn()
	}
}));

describe('OAuthRouteHandler', () => {
	let oauthRouteHandler: OAuthRouteHandler;
	let mockAuthService: AuthenticationService;
	let mockSessionService: SessionService;
	let mockCookies: Cookies;
	let originalEnv: string | undefined;

	beforeEach(() => {
		// Store original NODE_ENV
		originalEnv = process.env.NODE_ENV;

		// Mock authentication service
		mockAuthService = {
			authenticateUser: vi.fn()
		} as unknown as AuthenticationService;

		// Mock session service
		mockSessionService = {
			createSession: vi.fn(),
			validateSession: vi.fn(),
			invalidateSession: vi.fn()
		} as unknown as SessionService;

		// Mock cookies
		mockCookies = {
			set: vi.fn(),
			get: vi.fn(),
			delete: vi.fn()
		} as unknown as Cookies;

		oauthRouteHandler = new OAuthRouteHandler(mockAuthService, mockSessionService);

		// Clear all mocks
		vi.clearAllMocks();
	});

	afterEach(() => {
		// Restore original NODE_ENV
		process.env.NODE_ENV = originalEnv;
	});

	describe('handleOAuthCallback - Business Logic', () => {
		const mockUser: User = {
			id: 'user-123',
			email: 'test@example.com',
			name: 'Test User',
			provider: 'google',
			providerId: 'google-123',
			createdAt: new Date(),
			lastLoginAt: new Date()
		};

		describe('State Validation (CSRF Protection)', () => {
			it('should reject empty state parameter', async () => {
				await expect(
					oauthRouteHandler.handleOAuthCallback(
						'google',
						'auth-code',
						'', // Empty state
						'http://localhost:5173/callback',
						mockCookies
					)
				).rejects.toThrow('Invalid state parameter');
			});

			it('should reject whitespace-only state parameter', async () => {
				await expect(
					oauthRouteHandler.handleOAuthCallback(
						'google',
						'auth-code',
						'   ', // Whitespace only
						'http://localhost:5173/callback',
						mockCookies
					)
				).rejects.toThrow('Invalid state parameter');
			});

			it('should accept valid state parameter', async () => {
				(mockAuthService.authenticateUser as ReturnType<typeof vi.fn>).mockResolvedValue({
					user: mockUser,
					isNewUser: true
				});
				(mockSessionService.createSession as ReturnType<typeof vi.fn>).mockResolvedValue(
					'session-123'
				);

				const result = await oauthRouteHandler.handleOAuthCallback(
					'google',
					'auth-code',
					'valid-state-123',
					'http://localhost:5173/callback',
					mockCookies
				);

				expect(result.redirectTo).toBe('/');
				expect(result.sessionId).toBe('session-123');
			});
		});

		describe('Authentication Flow', () => {
			it('should complete full authentication flow for new user', async () => {
				(mockAuthService.authenticateUser as ReturnType<typeof vi.fn>).mockResolvedValue({
					user: mockUser,
					isNewUser: true
				});
				(mockSessionService.createSession as ReturnType<typeof vi.fn>).mockResolvedValue(
					'session-123'
				);

				const result = await oauthRouteHandler.handleOAuthCallback(
					'google',
					'auth-code',
					'state-123',
					'http://localhost:5173/callback',
					mockCookies
				);

				// Verify complete flow
				expect(mockAuthService.authenticateUser).toHaveBeenCalledWith(
					'google',
					'auth-code',
					'http://localhost:5173/callback'
				);
				expect(mockSessionService.createSession).toHaveBeenCalledWith('user-123');
				expect(result.redirectTo).toBe('/');
				expect(result.sessionId).toBe('session-123');
			});

			it('should complete full authentication flow for existing user', async () => {
				(mockAuthService.authenticateUser as ReturnType<typeof vi.fn>).mockResolvedValue({
					user: mockUser,
					isNewUser: false
				});
				(mockSessionService.createSession as ReturnType<typeof vi.fn>).mockResolvedValue(
					'session-456'
				);

				const result = await oauthRouteHandler.handleOAuthCallback(
					'google',
					'auth-code',
					'state-123',
					'http://localhost:5173/callback',
					mockCookies
				);

				expect(result.redirectTo).toBe('/');
				expect(result.sessionId).toBe('session-456');
			});
		});

		describe('Cookie Security Logic', () => {
			it('should set secure cookie in production environment', async () => {
				process.env.NODE_ENV = 'production';

				(mockAuthService.authenticateUser as ReturnType<typeof vi.fn>).mockResolvedValue({
					user: mockUser,
					isNewUser: true
				});
				(mockSessionService.createSession as ReturnType<typeof vi.fn>).mockResolvedValue(
					'session-123'
				);

				await oauthRouteHandler.handleOAuthCallback(
					'google',
					'auth-code',
					'state-123',
					'http://localhost:5173/callback',
					mockCookies
				);

				expect(mockCookies.set).toHaveBeenCalledWith('session_id', 'session-123', {
					path: '/',
					httpOnly: true,
					secure: true, // Should be true in production
					sameSite: 'lax',
					maxAge: 60 * 60 * 24 * 7 // 7 days
				});
			});

			it('should set non-secure cookie in development environment', async () => {
				process.env.NODE_ENV = 'development';

				(mockAuthService.authenticateUser as ReturnType<typeof vi.fn>).mockResolvedValue({
					user: mockUser,
					isNewUser: true
				});
				(mockSessionService.createSession as ReturnType<typeof vi.fn>).mockResolvedValue(
					'session-123'
				);

				await oauthRouteHandler.handleOAuthCallback(
					'google',
					'auth-code',
					'state-123',
					'http://localhost:5173/callback',
					mockCookies
				);

				expect(mockCookies.set).toHaveBeenCalledWith('session_id', 'session-123', {
					path: '/',
					httpOnly: true,
					secure: false, // Should be false in development
					sameSite: 'lax',
					maxAge: 60 * 60 * 24 * 7
				});
			});

			it('should set non-secure cookie when NODE_ENV is undefined', async () => {
				delete process.env.NODE_ENV;

				(mockAuthService.authenticateUser as ReturnType<typeof vi.fn>).mockResolvedValue({
					user: mockUser,
					isNewUser: true
				});
				(mockSessionService.createSession as ReturnType<typeof vi.fn>).mockResolvedValue(
					'session-123'
				);

				await oauthRouteHandler.handleOAuthCallback(
					'google',
					'auth-code',
					'state-123',
					'http://localhost:5173/callback',
					mockCookies
				);

				expect(mockCookies.set).toHaveBeenCalledWith('session_id', 'session-123', {
					path: '/',
					httpOnly: true,
					secure: false, // Should be false when NODE_ENV is undefined
					sameSite: 'lax',
					maxAge: 60 * 60 * 24 * 7
				});
			});
		});

		describe('Error Handling and Recovery', () => {
			it('should propagate authentication errors', async () => {
				const authError = new Error('OAuth provider error');
				(mockAuthService.authenticateUser as ReturnType<typeof vi.fn>).mockRejectedValue(authError);

				await expect(
					oauthRouteHandler.handleOAuthCallback(
						'google',
						'auth-code',
						'state-123',
						'http://localhost:5173/callback',
						mockCookies
					)
				).rejects.toThrow('OAuth provider error');

				// Verify session service was not called
				expect(mockSessionService.createSession).not.toHaveBeenCalled();
				expect(mockCookies.set).not.toHaveBeenCalled();
			});

			it('should propagate session creation errors', async () => {
				(mockAuthService.authenticateUser as ReturnType<typeof vi.fn>).mockResolvedValue({
					user: mockUser,
					isNewUser: true
				});
				(mockSessionService.createSession as ReturnType<typeof vi.fn>).mockRejectedValue(
					new Error('Session creation failed')
				);

				await expect(
					oauthRouteHandler.handleOAuthCallback(
						'google',
						'auth-code',
						'state-123',
						'http://localhost:5173/callback',
						mockCookies
					)
				).rejects.toThrow('Session creation failed');

				// Verify cookie was not set
				expect(mockCookies.set).not.toHaveBeenCalled();
			});
		});

		describe('Logging Behavior', () => {
			it('should log OAuth callback start', async () => {
				(mockAuthService.authenticateUser as ReturnType<typeof vi.fn>).mockResolvedValue({
					user: mockUser,
					isNewUser: true
				});
				(mockSessionService.createSession as ReturnType<typeof vi.fn>).mockResolvedValue(
					'session-123'
				);

				await oauthRouteHandler.handleOAuthCallback(
					'google',
					'auth-code',
					'state-123',
					'http://localhost:5173/callback',
					mockCookies
				);

				expect(logger.info).toHaveBeenCalledWith(
					'OAuthRouteHandler: Handling OAuth callback for google'
				);
			});

			it('should log user authentication result', async () => {
				(mockAuthService.authenticateUser as ReturnType<typeof vi.fn>).mockResolvedValue({
					user: mockUser,
					isNewUser: true
				});
				(mockSessionService.createSession as ReturnType<typeof vi.fn>).mockResolvedValue(
					'session-123'
				);

				await oauthRouteHandler.handleOAuthCallback(
					'google',
					'auth-code',
					'state-123',
					'http://localhost:5173/callback',
					mockCookies
				);

				expect(logger.info).toHaveBeenCalledWith(
					'OAuthRouteHandler: User authenticated: user-123, isNewUser: true'
				);
			});

			it('should log OAuth flow completion', async () => {
				(mockAuthService.authenticateUser as ReturnType<typeof vi.fn>).mockResolvedValue({
					user: mockUser,
					isNewUser: true
				});
				(mockSessionService.createSession as ReturnType<typeof vi.fn>).mockResolvedValue(
					'session-123'
				);

				await oauthRouteHandler.handleOAuthCallback(
					'google',
					'auth-code',
					'state-123',
					'http://localhost:5173/callback',
					mockCookies
				);

				expect(logger.info).toHaveBeenCalledWith(
					'OAuthRouteHandler: OAuth flow complete, redirecting to /'
				);
			});
		});
	});

	describe('handleLogout - Business Logic', () => {
		describe('Session Lifecycle Management', () => {
			it('should invalidate existing session and clear cookie', async () => {
				(mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue('session-123');

				await oauthRouteHandler.handleLogout(mockCookies);

				expect(mockSessionService.invalidateSession).toHaveBeenCalledWith('session-123');
				expect(mockCookies.delete).toHaveBeenCalledWith('session_id', { path: '/' });
			});

			it('should clear cookie even when no session exists', async () => {
				(mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

				await oauthRouteHandler.handleLogout(mockCookies);

				expect(mockSessionService.invalidateSession).not.toHaveBeenCalled();
				expect(mockCookies.delete).toHaveBeenCalledWith('session_id', { path: '/' });
			});

			it('should handle null session gracefully', async () => {
				(mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue(null);

				await oauthRouteHandler.handleLogout(mockCookies);

				expect(mockSessionService.invalidateSession).not.toHaveBeenCalled();
				expect(mockCookies.delete).toHaveBeenCalledWith('session_id', { path: '/' });
			});
		});

		describe('Error Handling', () => {
			it('should propagate session invalidation errors', async () => {
				(mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue('session-123');
				(mockSessionService.invalidateSession as ReturnType<typeof vi.fn>).mockRejectedValue(
					new Error('Session invalidation failed')
				);

				await expect(oauthRouteHandler.handleLogout(mockCookies)).rejects.toThrow(
					'Session invalidation failed'
				);
			});
		});

		describe('Logging Behavior', () => {
			it('should log logout completion', async () => {
				(mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue('session-123');

				await oauthRouteHandler.handleLogout(mockCookies);

				expect(logger.info).toHaveBeenCalledWith('OAuthRouteHandler: User logged out');
			});
		});
	});

	describe('Integration Scenarios', () => {
		it('should handle complete OAuth flow with different providers', async () => {
			const providers: Array<'google' | 'microsoft' | 'github'> = ['google', 'microsoft', 'github'];

			for (const provider of providers) {
				vi.clearAllMocks();

				const testUser: User = {
					id: 'user-123',
					email: 'test@example.com',
					name: 'Test User',
					provider,
					providerId: `${provider}-123`,
					createdAt: new Date(),
					lastLoginAt: new Date()
				};

				(mockAuthService.authenticateUser as ReturnType<typeof vi.fn>).mockResolvedValue({
					user: testUser,
					isNewUser: true
				});
				(mockSessionService.createSession as ReturnType<typeof vi.fn>).mockResolvedValue(
					'session-123'
				);

				const result = await oauthRouteHandler.handleOAuthCallback(
					provider,
					'auth-code',
					'state-123',
					'http://localhost:5173/callback',
					mockCookies
				);

				expect(result.redirectTo).toBe('/');
				expect(result.sessionId).toBe('session-123');
				expect(mockAuthService.authenticateUser).toHaveBeenCalledWith(
					provider,
					'auth-code',
					'http://localhost:5173/callback'
				);
			}
		});

		it('should handle rapid successive logouts gracefully', async () => {
			(mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue('session-123');

			// First logout
			await oauthRouteHandler.handleLogout(mockCookies);
			expect(mockSessionService.invalidateSession).toHaveBeenCalledTimes(1);

			// Second logout (no session)
			(mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
			await oauthRouteHandler.handleLogout(mockCookies);
			expect(mockSessionService.invalidateSession).toHaveBeenCalledTimes(1); // Still 1, not called again
		});
	});
});
