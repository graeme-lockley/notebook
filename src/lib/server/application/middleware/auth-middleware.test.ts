import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthMiddleware, withAuth, requireAuth, requireAuthApi } from './auth-middleware';
import type { SessionService } from '../services/session.service';
import type { User } from '$lib/server/domain/value-objects';
import type { RequestEvent } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

// Mock SvelteKit redirect
vi.mock('@sveltejs/kit', () => ({
	redirect: vi.fn()
}));

describe('AuthMiddleware', () => {
	let authMiddleware: AuthMiddleware;
	let mockSessionService: SessionService;
	let mockUser: User;
	let mockEvent: RequestEvent;

	beforeEach(() => {
		// Mock user
		mockUser = {
			id: 'user-123',
			email: 'test@example.com',
			name: 'Test User',
			provider: 'google',
			providerId: 'google-123',
			createdAt: new Date(),
			lastLoginAt: new Date()
		};

		// Mock session service
		mockSessionService = {
			validateSession: vi.fn(),
			createSession: vi.fn(),
			invalidateSession: vi.fn()
		} as unknown as SessionService;

		// Mock request event
		mockEvent = {
			url: new URL('http://localhost:3000/test'),
			cookies: {
				get: vi.fn(),
				set: vi.fn(),
				delete: vi.fn()
			},
			locals: {}
		} as unknown as RequestEvent;

		authMiddleware = new AuthMiddleware(mockSessionService);
		vi.clearAllMocks();
	});

	describe('processRequest', () => {
		describe('Session Validation', () => {
			it('should return authenticated user when valid session exists', async () => {
				(mockEvent.cookies.get as ReturnType<typeof vi.fn>).mockReturnValue('session-123');
				(mockSessionService.validateSession as ReturnType<typeof vi.fn>).mockResolvedValue(
					mockUser
				);

				const result = await authMiddleware.processRequest(mockEvent);

				expect(result.user).toEqual(mockUser);
				expect(result.isAuthenticated).toBe(true);
				expect(result.sessionId).toBe('session-123');
				expect(mockSessionService.validateSession).toHaveBeenCalledWith('session-123');
			});

			it('should return null user when no session exists', async () => {
				(mockEvent.cookies.get as ReturnType<typeof vi.fn>).mockReturnValue(null);

				const result = await authMiddleware.processRequest(mockEvent);

				expect(result.user).toBeNull();
				expect(result.isAuthenticated).toBe(false);
				expect(result.sessionId).toBeNull();
				expect(mockSessionService.validateSession).not.toHaveBeenCalled();
			});

			it('should return null user when session is invalid', async () => {
				(mockEvent.cookies.get as ReturnType<typeof vi.fn>).mockReturnValue('invalid-session');
				(mockSessionService.validateSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

				const result = await authMiddleware.processRequest(mockEvent);

				expect(result.user).toBeNull();
				expect(result.isAuthenticated).toBe(false);
				expect(result.sessionId).toBe('invalid-session');
			});

			it('should handle session validation errors gracefully', async () => {
				(mockEvent.cookies.get as ReturnType<typeof vi.fn>).mockReturnValue('session-123');
				(mockSessionService.validateSession as ReturnType<typeof vi.fn>).mockRejectedValue(
					new Error('Session validation failed')
				);

				const result = await authMiddleware.processRequest(mockEvent);

				expect(result.user).toBeNull();
				expect(result.isAuthenticated).toBe(false);
				expect(result.sessionId).toBe('session-123');
			});
		});

		describe('Authentication Requirements', () => {
			it('should allow unauthenticated users when auth is not required', async () => {
				(mockEvent.cookies.get as ReturnType<typeof vi.fn>).mockReturnValue(null);

				const result = await authMiddleware.processRequest(mockEvent, { requireAuth: false });

				expect(result.isAuthenticated).toBe(false);
				expect(redirect).not.toHaveBeenCalled();
			});

			it('should redirect unauthenticated users when auth is required', async () => {
				(mockEvent.cookies.get as ReturnType<typeof vi.fn>).mockReturnValue(null);
				vi.mocked(redirect).mockImplementation(() => {
					throw new Error('Redirect');
				});

				await expect(
					authMiddleware.processRequest(mockEvent, { requireAuth: true })
				).rejects.toThrow('Redirect');

				expect(redirect).toHaveBeenCalledWith(302, '/auth/google');
			});

			it('should use custom redirect URL when provided', async () => {
				(mockEvent.cookies.get as ReturnType<typeof vi.fn>).mockReturnValue(null);
				vi.mocked(redirect).mockImplementation(() => {
					throw new Error('Redirect');
				});

				await expect(
					authMiddleware.processRequest(mockEvent, {
						requireAuth: true,
						redirectTo: '/custom-login'
					})
				).rejects.toThrow('Redirect');

				expect(redirect).toHaveBeenCalledWith(302, '/custom-login');
			});

			it('should throw error instead of redirecting when redirectOnAuthFailure is false', async () => {
				(mockEvent.cookies.get as ReturnType<typeof vi.fn>).mockReturnValue(null);

				await expect(
					authMiddleware.processRequest(mockEvent, {
						requireAuth: true,
						redirectOnAuthFailure: false
					})
				).rejects.toThrow('Authentication required');

				expect(redirect).not.toHaveBeenCalled();
			});

			it('should allow authenticated users when auth is required', async () => {
				(mockEvent.cookies.get as ReturnType<typeof vi.fn>).mockReturnValue('session-123');
				(mockSessionService.validateSession as ReturnType<typeof vi.fn>).mockResolvedValue(
					mockUser
				);

				const result = await authMiddleware.processRequest(mockEvent, { requireAuth: true });

				expect(result.user).toEqual(mockUser);
				expect(result.isAuthenticated).toBe(true);
				expect(redirect).not.toHaveBeenCalled();
			});
		});
	});

	describe('Permission Helpers', () => {
		it('should return true for authenticated users (all permissions)', () => {
			expect(authMiddleware.hasPermission(mockUser, 'any-permission')).toBe(true);
		});

		it('should return false for null users', () => {
			expect(authMiddleware.hasPermission(null, 'any-permission')).toBe(false);
		});

		it('should return true when user owns resource', () => {
			expect(authMiddleware.ownsResource(mockUser, 'user-123')).toBe(true);
		});

		it('should return false when user does not own resource', () => {
			expect(authMiddleware.ownsResource(mockUser, 'other-user-456')).toBe(false);
		});

		it('should return false when user is null', () => {
			expect(authMiddleware.ownsResource(null, 'user-123')).toBe(false);
		});
	});
});

describe('withAuth Higher-Order Function', () => {
	let mockSessionService: SessionService;
	let mockEvent: RequestEvent;
	let mockUser: User;

	beforeEach(() => {
		mockUser = {
			id: 'user-123',
			email: 'test@example.com',
			name: 'Test User',
			provider: 'google',
			providerId: 'google-123',
			createdAt: new Date(),
			lastLoginAt: new Date()
		};

		mockSessionService = {
			validateSession: vi.fn().mockResolvedValue(mockUser),
			createSession: vi.fn(),
			invalidateSession: vi.fn()
		} as unknown as SessionService;

		mockEvent = {
			url: new URL('http://localhost:3000/test'),
			cookies: {
				get: vi.fn().mockReturnValue('session-123'),
				set: vi.fn(),
				delete: vi.fn()
			},
			locals: {
				sessionService: mockSessionService
			}
		} as unknown as RequestEvent;

		vi.clearAllMocks();
	});

	it('should inject auth context into event.locals', async () => {
		const handler = vi.fn().mockResolvedValue(new Response('OK'));
		const wrappedHandler = withAuth(handler);

		await wrappedHandler(mockEvent);

		expect(mockEvent.locals.user).toEqual(mockUser);
		expect(mockEvent.locals.isAuthenticated).toBe(true);
		expect(mockEvent.locals.sessionId).toBe('session-123');
		expect(handler).toHaveBeenCalledWith(mockEvent, {
			user: mockUser,
			isAuthenticated: true,
			sessionId: 'session-123'
		});
	});

	it('should handle missing session service gracefully', async () => {
		// @ts-expect-error - Testing missing service scenario
		mockEvent.locals.sessionService = undefined;
		const handler = vi.fn();
		const wrappedHandler = withAuth(handler);

		await expect(wrappedHandler(mockEvent)).rejects.toThrow('Authentication service not available');
	});
});

describe('requireAuth Higher-Order Function', () => {
	let mockSessionService: SessionService;
	let mockEvent: RequestEvent;

	beforeEach(() => {
		mockSessionService = {
			validateSession: vi.fn(),
			createSession: vi.fn(),
			invalidateSession: vi.fn()
		} as unknown as SessionService;

		mockEvent = {
			url: new URL('http://localhost:3000/test'),
			cookies: {
				get: vi.fn(),
				set: vi.fn(),
				delete: vi.fn()
			},
			locals: {
				sessionService: mockSessionService
			}
		} as unknown as RequestEvent;

		vi.clearAllMocks();
	});

	it('should redirect unauthenticated users', async () => {
		(mockEvent.cookies.get as ReturnType<typeof vi.fn>).mockReturnValue(null);
		vi.mocked(redirect).mockImplementation(() => {
			throw new Error('Redirect');
		});

		const handler = vi.fn();
		const wrappedHandler = requireAuth(handler);

		await expect(wrappedHandler(mockEvent)).rejects.toThrow('Redirect');
		expect(redirect).toHaveBeenCalledWith(302, '/auth/google');
	});

	it('should use custom redirect URL', async () => {
		(mockEvent.cookies.get as ReturnType<typeof vi.fn>).mockReturnValue(null);
		vi.mocked(redirect).mockImplementation(() => {
			throw new Error('Redirect');
		});

		const handler = vi.fn();
		const wrappedHandler = requireAuth(handler, { redirectTo: '/custom-login' });

		await expect(wrappedHandler(mockEvent)).rejects.toThrow('Redirect');
		expect(redirect).toHaveBeenCalledWith(302, '/custom-login');
	});
});

describe('requireAuthApi Higher-Order Function', () => {
	let mockSessionService: SessionService;
	let mockEvent: RequestEvent;

	beforeEach(() => {
		mockSessionService = {
			validateSession: vi.fn(),
			createSession: vi.fn(),
			invalidateSession: vi.fn()
		} as unknown as SessionService;

		mockEvent = {
			url: new URL('http://localhost:3000/api/test'),
			cookies: {
				get: vi.fn(),
				set: vi.fn(),
				delete: vi.fn()
			},
			locals: {
				sessionService: mockSessionService
			}
		} as unknown as RequestEvent;

		vi.clearAllMocks();
	});

	it('should throw error instead of redirecting for API routes', async () => {
		(mockEvent.cookies.get as ReturnType<typeof vi.fn>).mockReturnValue(null);

		const handler = vi.fn();
		const wrappedHandler = requireAuthApi(handler);

		await expect(wrappedHandler(mockEvent)).rejects.toThrow('Authentication required');
		expect(redirect).not.toHaveBeenCalled();
	});
});
