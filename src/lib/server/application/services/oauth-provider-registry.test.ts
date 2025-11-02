import { describe, it, expect } from 'vitest';
import { OAuthProviderRegistry } from './oauth-provider-registry';
import type { OAuthProvider } from '../ports/outbound/oauth-provider';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

// Mock OAuth providers for testing
class MockGoogleProvider implements OAuthProvider {
	readonly name = 'google' as const;

	getAuthorizationUrl(state: string, redirectUri: string): string {
		return `https://accounts.google.com/oauth/authorize?state=${state}&redirect_uri=${redirectUri}`;
	}

	async exchangeCodeForToken(code: string, redirectUri: string) {
		// Mock implementation - parameters used for type checking
		logger.info(`Mock exchangeCodeForToken: ${code} -> ${redirectUri}`);
		return {
			accessToken: 'mock-access-token',
			refreshToken: 'mock-refresh-token',
			expiresIn: 3600,
			idToken: 'mock-id-token'
		};
	}

	async getUserInfo(accessToken: string) {
		// Mock implementation - parameter used for type checking
		logger.info(`Mock getUserInfo: ${accessToken}`);
		return {
			id: 'mock-user-id',
			email: 'test@example.com',
			emailVerified: true,
			name: 'Test User',
			picture: 'https://example.com/avatar.jpg'
		};
	}
}

class MockMicrosoftProvider implements OAuthProvider {
	readonly name = 'microsoft' as const;

	getAuthorizationUrl(state: string, redirectUri: string): string {
		return `https://login.microsoftonline.com/oauth2/v2.0/authorize?state=${state}&redirect_uri=${redirectUri}`;
	}

	async exchangeCodeForToken(code: string, redirectUri: string) {
		// Mock implementation - parameters used for type checking
		logger.info(`Mock MS exchangeCodeForToken: ${code} -> ${redirectUri}`);
		return {
			accessToken: 'mock-ms-access-token',
			refreshToken: 'mock-ms-refresh-token',
			expiresIn: 3600,
			idToken: 'mock-ms-id-token'
		};
	}

	async getUserInfo(accessToken: string) {
		// Mock implementation - parameter used for type checking
		logger.info(`Mock MS getUserInfo: ${accessToken}`);
		return {
			id: 'mock-ms-user-id',
			email: 'test@microsoft.com',
			emailVerified: true,
			name: 'Microsoft User',
			picture: 'https://example.com/ms-avatar.jpg'
		};
	}
}

describe('OAuthProviderRegistry', () => {
	describe('constructor', () => {
		it('should register providers from constructor', () => {
			const googleProvider = new MockGoogleProvider();
			const microsoftProvider = new MockMicrosoftProvider();
			const registry = new OAuthProviderRegistry([googleProvider, microsoftProvider]);

			expect(registry.hasProvider('google')).toBe(true);
			expect(registry.hasProvider('microsoft')).toBe(true);
			expect(registry.getAvailableProviders()).toEqual(['google', 'microsoft']);
		});

		it('should handle empty providers array', () => {
			const registry = new OAuthProviderRegistry([]);

			expect(registry.getAvailableProviders()).toEqual([]);
			expect(registry.hasProvider('google')).toBe(false);
		});

		it('should handle single provider', () => {
			const googleProvider = new MockGoogleProvider();
			const registry = new OAuthProviderRegistry([googleProvider]);

			expect(registry.hasProvider('google')).toBe(true);
			expect(registry.getAvailableProviders()).toEqual(['google']);
		});
	});

	describe('getProvider', () => {
		it('should return registered provider', () => {
			const googleProvider = new MockGoogleProvider();
			const registry = new OAuthProviderRegistry([googleProvider]);

			const retrievedProvider = registry.getProvider('google');
			expect(retrievedProvider).toBe(googleProvider);
			expect(retrievedProvider.name).toBe('google');
		});

		it('should throw error for unregistered provider', () => {
			const googleProvider = new MockGoogleProvider();
			const registry = new OAuthProviderRegistry([googleProvider]);

			expect(() => {
				registry.getProvider('microsoft');
			}).toThrow("OAuth provider 'microsoft' not registered");
		});

		it('should throw error for invalid provider name', () => {
			const googleProvider = new MockGoogleProvider();
			const registry = new OAuthProviderRegistry([googleProvider]);

			expect(() => {
				registry.getProvider('invalid' as 'google');
			}).toThrow("OAuth provider 'invalid' not registered");
		});
	});

	describe('getAvailableProviders', () => {
		it('should return all registered providers', () => {
			const googleProvider = new MockGoogleProvider();
			const microsoftProvider = new MockMicrosoftProvider();
			const registry = new OAuthProviderRegistry([googleProvider, microsoftProvider]);

			const providers = registry.getAvailableProviders();
			expect(providers).toContain('google');
			expect(providers).toContain('microsoft');
			expect(providers).toHaveLength(2);
		});

		it('should return empty array when no providers registered', () => {
			const registry = new OAuthProviderRegistry([]);
			expect(registry.getAvailableProviders()).toEqual([]);
		});

		it('should return providers in registration order', () => {
			const googleProvider = new MockGoogleProvider();
			const microsoftProvider = new MockMicrosoftProvider();
			const registry = new OAuthProviderRegistry([googleProvider, microsoftProvider]);

			expect(registry.getAvailableProviders()).toEqual(['google', 'microsoft']);
		});
	});

	describe('hasProvider', () => {
		it('should return true for registered provider', () => {
			const googleProvider = new MockGoogleProvider();
			const registry = new OAuthProviderRegistry([googleProvider]);

			expect(registry.hasProvider('google')).toBe(true);
		});

		it('should return false for unregistered provider', () => {
			const googleProvider = new MockGoogleProvider();
			const registry = new OAuthProviderRegistry([googleProvider]);

			expect(registry.hasProvider('microsoft')).toBe(false);
		});

		it('should return false for invalid provider name', () => {
			const googleProvider = new MockGoogleProvider();
			const registry = new OAuthProviderRegistry([googleProvider]);

			expect(registry.hasProvider('invalid' as 'google')).toBe(false);
		});
	});

	describe('provider functionality', () => {
		it('should allow calling methods on retrieved providers', async () => {
			const googleProvider = new MockGoogleProvider();
			const registry = new OAuthProviderRegistry([googleProvider]);

			const provider = registry.getProvider('google');
			const authUrl = provider.getAuthorizationUrl('test-state', 'http://localhost:5173/callback');
			expect(authUrl).toContain('accounts.google.com');
			expect(authUrl).toContain('test-state');

			const token = await provider.exchangeCodeForToken(
				'test-code',
				'http://localhost:5173/callback'
			);
			expect(token.accessToken).toBe('mock-access-token');

			const userInfo = await provider.getUserInfo('test-token');
			expect(userInfo.email).toBe('test@example.com');
		});

		it('should work with multiple providers', async () => {
			const googleProvider = new MockGoogleProvider();
			const microsoftProvider = new MockMicrosoftProvider();
			const registry = new OAuthProviderRegistry([googleProvider, microsoftProvider]);

			// Test Google provider
			const googleAuthUrl = registry
				.getProvider('google')
				.getAuthorizationUrl('state1', 'http://localhost:5173/callback');
			expect(googleAuthUrl).toContain('accounts.google.com');

			// Test Microsoft provider
			const msAuthUrl = registry
				.getProvider('microsoft')
				.getAuthorizationUrl('state2', 'http://localhost:5173/callback');
			expect(msAuthUrl).toContain('login.microsoftonline.com');
		});
	});
});
