import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { AuthService, authUser, isAuthenticated, isLoading } from './auth.service';
import type { User } from '$lib/server/domain/value-objects';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.location
const mockLocation = {
	href: ''
};
Object.defineProperty(window, 'location', {
	value: mockLocation,
	writable: true
});

describe('AuthService', () => {
	let authService: AuthService;
	const mockUser: User = {
		id: 'user-123',
		name: 'John Doe',
		email: 'john@example.com',
		picture: 'https://example.com/avatar.jpg',
		provider: 'google',
		providerId: 'google-123',
		createdAt: new Date(),
		lastLoginAt: new Date()
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockLocation.href = '';
		authService = AuthService.getInstance();
		// Reset stores
		authUser.set(null);
		isLoading.set(false);
	});

	describe('Singleton Pattern', () => {
		it('should return the same instance', () => {
			const instance1 = AuthService.getInstance();
			const instance2 = AuthService.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe('User Management', () => {
		it('should set and get current user', () => {
			authService.setUser(mockUser);
			expect(authService.getCurrentUser()).toEqual(mockUser);
			expect(get(authUser)).toEqual(mockUser);
		});

		it('should clear user when set to null', () => {
			authService.setUser(mockUser);
			authService.setUser(null);
			expect(authService.getCurrentUser()).toBeNull();
			expect(get(authUser)).toBeNull();
		});

		it('should check authentication status correctly', () => {
			expect(authService.isUserAuthenticated()).toBe(false);
			expect(get(isAuthenticated)).toBe(false);

			authService.setUser(mockUser);
			expect(authService.isUserAuthenticated()).toBe(true);
			expect(get(isAuthenticated)).toBe(true);

			authService.setUser(null);
			expect(authService.isUserAuthenticated()).toBe(false);
			expect(get(isAuthenticated)).toBe(false);
		});
	});

	describe('Loading State', () => {
		it('should set and get loading state', () => {
			expect(authService.isLoading()).toBe(false);
			expect(get(isLoading)).toBe(false);

			authService.setLoading(true);
			expect(authService.isLoading()).toBe(true);
			expect(get(isLoading)).toBe(true);

			authService.setLoading(false);
			expect(authService.isLoading()).toBe(false);
			expect(get(isLoading)).toBe(false);
		});
	});

	describe('Sign In', () => {
		it('should redirect to Google OAuth', () => {
			authService.signIn();
			expect(mockLocation.href).toBe('/auth/google');
		});
	});

	describe('Sign Out', () => {
		it('should redirect to logout endpoint', async () => {
			await authService.signOut();
			expect(mockLocation.href).toBe('/auth/logout');
		});

		it('should set loading state during sign out', async () => {
			const signOutPromise = authService.signOut();
			expect(authService.isLoading()).toBe(true);
			expect(get(isLoading)).toBe(true);

			await signOutPromise;
			// Note: loading state remains true because we redirect
		});
	});

	describe('Server Initialization', () => {
		it('should initialize with user data from server', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ user: mockUser })
			});

			await authService.refresh();

			expect(mockFetch).toHaveBeenCalledWith('/api/auth/me');
			expect(authService.getCurrentUser()).toEqual(mockUser);
			expect(get(authUser)).toEqual(mockUser);
		});

		it('should handle server response with no user', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ user: null })
			});

			await authService.refresh();

			expect(mockFetch).toHaveBeenCalledWith('/api/auth/me');
			expect(authService.getCurrentUser()).toBeNull();
			expect(get(authUser)).toBeNull();
		});

		it('should handle server error gracefully', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			await authService.refresh();

			expect(mockFetch).toHaveBeenCalledWith('/api/auth/me');
			expect(authService.getCurrentUser()).toBeNull();
			expect(get(authUser)).toBeNull();
		});

		it('should handle non-ok response', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 401
			});

			await authService.refresh();

			expect(mockFetch).toHaveBeenCalledWith('/api/auth/me');
			expect(authService.getCurrentUser()).toBeNull();
			expect(get(authUser)).toBeNull();
		});

		it('should set loading state during refresh', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ user: mockUser })
			});

			const refreshPromise = authService.refresh();
			expect(authService.isLoading()).toBe(true);
			expect(get(isLoading)).toBe(true);

			await refreshPromise;
			expect(authService.isLoading()).toBe(false);
			expect(get(isLoading)).toBe(false);
		});
	});

	describe('Store Integration', () => {
		it('should update authUser store when user is set', () => {
			authService.setUser(mockUser);
			expect(get(authUser)).toEqual(mockUser);
		});

		it('should update isAuthenticated store when user is set', () => {
			authService.setUser(mockUser);
			expect(get(isAuthenticated)).toBe(true);

			authService.setUser(null);
			expect(get(isAuthenticated)).toBe(false);
		});

		it('should update isLoading store when loading state changes', () => {
			authService.setLoading(true);
			expect(get(isLoading)).toBe(true);

			authService.setLoading(false);
			expect(get(isLoading)).toBe(false);
		});
	});
});
