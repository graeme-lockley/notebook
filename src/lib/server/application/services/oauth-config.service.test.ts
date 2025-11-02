import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OAuthConfigService } from './oauth-config.service';

describe('OAuthConfigService', () => {
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(() => {
		// Store original environment
		originalEnv = { ...process.env };
		// Clear environment variables
		process.env = {};
		// Mock $env/dynamic/private to use process.env directly
		vi.mock('$env/dynamic/private', () => ({
			env: new Proxy({} as Record<string, string | undefined>, {
				get: (_, prop: string) => process.env[prop]
			})
		}));
	});

	afterEach(() => {
		// Restore original environment
		process.env = originalEnv;
	});

	describe('constructor', () => {
		it('should load Google OAuth config when environment variables are set', () => {
			process.env.GOOGLE_CLIENT_ID = 'test-client-id';
			process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
			process.env.GOOGLE_REDIRECT_URI = 'http://localhost:5173/auth/google/callback';

			const service = new OAuthConfigService();

			expect(service.isProviderConfigured('google')).toBe(true);
			expect(service.getAvailableProviders()).toEqual(['google']);

			const config = service.getConfig('google');
			expect(config).toEqual({
				clientId: 'test-client-id',
				clientSecret: 'test-client-secret',
				redirectUri: 'http://localhost:5173/auth/google/callback'
			});
		});

		it('should not load Google OAuth config when environment variables are missing', () => {
			// No environment variables set
			const service = new OAuthConfigService();

			expect(service.isProviderConfigured('google')).toBe(false);
			expect(service.getAvailableProviders()).toEqual([]);
		});

		it('should not load Google OAuth config when only some environment variables are set', () => {
			process.env.GOOGLE_CLIENT_ID = 'test-client-id';
			// Missing GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI

			const service = new OAuthConfigService();

			expect(service.isProviderConfigured('google')).toBe(false);
			expect(service.getAvailableProviders()).toEqual([]);
		});

		it('should not load Google OAuth config when client ID is empty', () => {
			process.env.GOOGLE_CLIENT_ID = '';
			process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
			process.env.GOOGLE_REDIRECT_URI = 'http://localhost:5173/auth/google/callback';

			const service = new OAuthConfigService();

			expect(service.isProviderConfigured('google')).toBe(false);
			expect(service.getAvailableProviders()).toEqual([]);
		});

		it('should not load Google OAuth config when client secret is empty', () => {
			process.env.GOOGLE_CLIENT_ID = 'test-client-id';
			process.env.GOOGLE_CLIENT_SECRET = '';
			process.env.GOOGLE_REDIRECT_URI = 'http://localhost:5173/auth/google/callback';

			const service = new OAuthConfigService();

			expect(service.isProviderConfigured('google')).toBe(false);
			expect(service.getAvailableProviders()).toEqual([]);
		});

		it('should not load Google OAuth config when redirect URI is empty', () => {
			process.env.GOOGLE_CLIENT_ID = 'test-client-id';
			process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
			process.env.GOOGLE_REDIRECT_URI = '';

			const service = new OAuthConfigService();

			expect(service.isProviderConfigured('google')).toBe(false);
			expect(service.getAvailableProviders()).toEqual([]);
		});
	});

	describe('getConfig', () => {
		it('should return config for configured provider', () => {
			process.env.GOOGLE_CLIENT_ID = 'test-client-id';
			process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
			process.env.GOOGLE_REDIRECT_URI = 'http://localhost:5173/auth/google/callback';

			const service = new OAuthConfigService();
			const config = service.getConfig('google');

			expect(config).toEqual({
				clientId: 'test-client-id',
				clientSecret: 'test-client-secret',
				redirectUri: 'http://localhost:5173/auth/google/callback'
			});
		});

		it('should throw error for unconfigured provider', () => {
			const service = new OAuthConfigService();

			expect(() => {
				service.getConfig('google');
			}).toThrow("OAuth provider 'google' is not configured. Check environment variables.");
		});

		it('should throw error for invalid provider', () => {
			process.env.GOOGLE_CLIENT_ID = 'test-client-id';
			process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
			process.env.GOOGLE_REDIRECT_URI = 'http://localhost:5173/auth/google/callback';

			const service = new OAuthConfigService();

			expect(() => {
				service.getConfig('microsoft' as 'google');
			}).toThrow("OAuth provider 'microsoft' is not configured. Check environment variables.");
		});
	});

	describe('getAvailableProviders', () => {
		it('should return empty array when no providers configured', () => {
			const service = new OAuthConfigService();
			expect(service.getAvailableProviders()).toEqual([]);
		});

		it('should return configured providers', () => {
			process.env.GOOGLE_CLIENT_ID = 'test-client-id';
			process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
			process.env.GOOGLE_REDIRECT_URI = 'http://localhost:5173/auth/google/callback';

			const service = new OAuthConfigService();
			expect(service.getAvailableProviders()).toEqual(['google']);
		});
	});

	describe('isProviderConfigured', () => {
		it('should return false for unconfigured provider', () => {
			const service = new OAuthConfigService();
			expect(service.isProviderConfigured('google')).toBe(false);
		});

		it('should return true for configured provider', () => {
			process.env.GOOGLE_CLIENT_ID = 'test-client-id';
			process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
			process.env.GOOGLE_REDIRECT_URI = 'http://localhost:5173/auth/google/callback';

			const service = new OAuthConfigService();
			expect(service.isProviderConfigured('google')).toBe(true);
		});

		it('should return false for invalid provider', () => {
			process.env.GOOGLE_CLIENT_ID = 'test-client-id';
			process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
			process.env.GOOGLE_REDIRECT_URI = 'http://localhost:5173/auth/google/callback';

			const service = new OAuthConfigService();
			expect(service.isProviderConfigured('microsoft' as 'google')).toBe(false);
		});
	});

	describe('config validation', () => {
		it('should handle different redirect URI formats', () => {
			process.env.GOOGLE_CLIENT_ID = 'test-client-id';
			process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
			process.env.GOOGLE_REDIRECT_URI = 'https://example.com/auth/google/callback';

			const service = new OAuthConfigService();
			const config = service.getConfig('google');

			expect(config.redirectUri).toBe('https://example.com/auth/google/callback');
		});

		it('should handle different port numbers in redirect URI', () => {
			process.env.GOOGLE_CLIENT_ID = 'test-client-id';
			process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
			process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/auth/google/callback';

			const service = new OAuthConfigService();
			const config = service.getConfig('google');

			// Note: In test environment, $env/dynamic/private may use Vite's resolved env
			// which could default to port 5173. This test verifies the service works
			// correctly when the redirect URI is explicitly set.
			expect(config.redirectUri).toBe('http://localhost:3000/auth/google/callback');
		});
	});
});
