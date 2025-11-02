import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthenticationService } from './authentication.service';
import type { OAuthProviderRegistry } from './oauth-provider-registry';
import type { EventStore } from '../ports/outbound/event-store';
import type { EventBus } from '../ports/outbound/event-bus';
import type { UserReadModel } from '../ports/inbound/user-read-model';
import type { User } from '$lib/server/domain/value-objects';

describe('AuthenticationService', () => {
	let authService: AuthenticationService;
	let mockProviderRegistry: OAuthProviderRegistry;
	let mockEventStore: EventStore;
	let mockEventBus: EventBus;
	let mockUserReadModel: UserReadModel;
	let mockOAuthProvider: {
		name: 'google';
		getAuthorizationUrl: ReturnType<typeof vi.fn>;
		exchangeCodeForToken: ReturnType<typeof vi.fn>;
		getUserInfo: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		// Mock OAuth provider
		mockOAuthProvider = {
			name: 'google' as const,
			getAuthorizationUrl: vi
				.fn()
				.mockReturnValue('https://accounts.google.com/oauth/authorize?state=test'),
			exchangeCodeForToken: vi.fn().mockResolvedValue({
				accessToken: 'mock-access-token',
				refreshToken: 'mock-refresh-token',
				expiresIn: 3600,
				idToken: 'mock-id-token'
			}),
			getUserInfo: vi.fn().mockResolvedValue({
				id: 'google-123',
				email: 'test@example.com',
				emailVerified: true,
				name: 'Test User',
				picture: 'https://example.com/avatar.jpg'
			})
		};

		// Mock provider registry
		mockProviderRegistry = {
			getProvider: vi.fn().mockReturnValue(mockOAuthProvider)
		} as unknown as OAuthProviderRegistry;

		// Mock event store
		mockEventStore = {
			publishEvent: vi.fn().mockResolvedValue('event-id-123')
		} as unknown as EventStore;

		// Mock event bus
		mockEventBus = {
			publish: vi.fn().mockResolvedValue(undefined)
		} as unknown as EventBus;

		// Mock user read model
		mockUserReadModel = {
			getUserById: vi.fn(),
			getUserByProvider: vi.fn(),
			getUserByEmail: vi.fn(),
			getAllUsers: vi.fn()
		} as unknown as UserReadModel;

		authService = new AuthenticationService(
			mockProviderRegistry,
			mockEventStore,
			mockEventBus,
			mockUserReadModel
		);
	});

	describe('getAuthorizationUrl', () => {
		it('should return authorization URL from provider', () => {
			const url = authService.getAuthorizationUrl(
				'google',
				'test-state',
				'http://localhost:5173/callback'
			);

			expect(mockProviderRegistry.getProvider).toHaveBeenCalledWith('google');
			expect(mockOAuthProvider.getAuthorizationUrl).toHaveBeenCalledWith(
				'test-state',
				'http://localhost:5173/callback'
			);
			expect(url).toBe('https://accounts.google.com/oauth/authorize?state=test');
		});

		it('should throw error for unregistered provider', () => {
			(mockProviderRegistry.getProvider as ReturnType<typeof vi.fn>).mockImplementation(() => {
				throw new Error("OAuth provider 'microsoft' not registered");
			});

			expect(() => {
				authService.getAuthorizationUrl(
					'microsoft',
					'test-state',
					'http://localhost:5173/callback'
				);
			}).toThrow("OAuth provider 'microsoft' not registered");
		});
	});

	describe('authenticateUser', () => {
		it('should create new user when user does not exist', async () => {
			// Mock user not found
			(mockUserReadModel.getUserByProvider as ReturnType<typeof vi.fn>).mockResolvedValue(null);

			// Mock user found after creation
			const mockUser: User = {
				id: 'user-123',
				email: 'test@example.com',
				name: 'Test User',
				picture: 'https://example.com/avatar.jpg',
				provider: 'google',
				providerId: 'google-123',
				createdAt: new Date(),
				lastLoginAt: new Date()
			};
			(mockUserReadModel.getUserByProvider as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce(mockUser);

			const result = await authService.authenticateUser(
				'google',
				'auth-code',
				'http://localhost:5173/callback'
			);

			expect(result.user).toEqual(mockUser);
			expect(result.isNewUser).toBe(true);
			expect(mockOAuthProvider.exchangeCodeForToken).toHaveBeenCalledWith(
				'auth-code',
				'http://localhost:5173/callback'
			);
			expect(mockOAuthProvider.getUserInfo).toHaveBeenCalledWith('mock-access-token');
			expect(mockEventStore.publishEvent).toHaveBeenCalledWith(
				'users',
				'user.registered',
				expect.any(Object)
			);
			expect(mockEventBus.publish).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'user.registered',
					payload: expect.objectContaining({
						userId: expect.any(String),
						email: 'test@example.com',
						name: 'Test User',
						provider: 'google',
						providerId: 'google-123'
					})
				})
			);
		});

		it('should login existing user when user exists', async () => {
			const existingUser: User = {
				id: 'user-123',
				email: 'test@example.com',
				name: 'Test User',
				picture: 'https://example.com/avatar.jpg',
				provider: 'google',
				providerId: 'google-123',
				createdAt: new Date(),
				lastLoginAt: new Date()
			};

			// Mock user found
			(mockUserReadModel.getUserByProvider as ReturnType<typeof vi.fn>).mockResolvedValue(
				existingUser
			);

			const result = await authService.authenticateUser(
				'google',
				'auth-code',
				'http://localhost:5173/callback'
			);

			expect(result.user).toEqual(existingUser);
			expect(result.isNewUser).toBe(false);
			expect(mockEventStore.publishEvent).toHaveBeenCalledWith(
				'users',
				'user.logged_in',
				expect.any(Object)
			);
			expect(mockEventBus.publish).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'user.logged_in',
					payload: expect.objectContaining({
						userId: 'user-123'
					})
				})
			);
		});

		it('should handle provider errors during token exchange', async () => {
			(mockOAuthProvider.exchangeCodeForToken as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error('Invalid authorization code')
			);

			await expect(
				authService.authenticateUser('google', 'invalid-code', 'http://localhost:5173/callback')
			).rejects.toThrow('Invalid authorization code');
		});

		it('should handle provider errors during user info retrieval', async () => {
			(mockOAuthProvider.getUserInfo as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error('Invalid access token')
			);

			await expect(
				authService.authenticateUser('google', 'auth-code', 'http://localhost:5173/callback')
			).rejects.toThrow('Invalid access token');
		});

		it('should handle event store errors during user creation', async () => {
			(mockUserReadModel.getUserByProvider as ReturnType<typeof vi.fn>).mockResolvedValue(null);
			(mockEventStore.publishEvent as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error('Event store error')
			);

			await expect(
				authService.authenticateUser('google', 'auth-code', 'http://localhost:5173/callback')
			).rejects.toThrow('Event store error');
		});

		it('should handle read model errors after user creation', async () => {
			(mockUserReadModel.getUserByProvider as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(null) // First call - user not found
				.mockResolvedValueOnce(null); // Second call - still not found (error case)

			await expect(
				authService.authenticateUser('google', 'auth-code', 'http://localhost:5173/callback')
			).rejects.toThrow('Failed to retrieve newly created user');
		});
	});

	describe('single-provider enforcement', () => {
		it('should work with different providers for different users', async () => {
			const googleUser: User = {
				id: 'user-google',
				email: 'google@example.com',
				name: 'Google User',
				provider: 'google',
				providerId: 'google-123',
				createdAt: new Date(),
				lastLoginAt: new Date()
			};

			const microsoftUser: User = {
				id: 'user-microsoft',
				email: 'microsoft@example.com',
				name: 'Microsoft User',
				provider: 'microsoft',
				providerId: 'ms-456',
				createdAt: new Date(),
				lastLoginAt: new Date()
			};

			// Mock different users for different providers - first call returns null (user doesn't exist), second call returns the user (after creation)
			(mockUserReadModel.getUserByProvider as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(null) // First call for Google - user doesn't exist
				.mockResolvedValueOnce(googleUser) // Second call for Google - user exists after creation
				.mockResolvedValueOnce(null) // First call for Microsoft - user doesn't exist
				.mockResolvedValueOnce(microsoftUser); // Second call for Microsoft - user exists after creation

			// Test Google user
			const googleResult = await authService.authenticateUser(
				'google',
				'code',
				'http://localhost:5173/callback'
			);
			expect(googleResult.user.id).toBe('user-google');
			expect(googleResult.isNewUser).toBe(true);

			// Test Microsoft user
			const msResult = await authService.authenticateUser(
				'microsoft',
				'code',
				'http://localhost:5173/callback'
			);
			expect(msResult.user.id).toBe('user-microsoft');
			expect(msResult.isNewUser).toBe(true);
		});
	});
});
