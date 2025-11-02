import type { AuthProvider } from '$lib/server/domain/value-objects';
import { logger } from '$lib/common/infrastructure/logging/logger.service';
import { env } from '$env/dynamic/private';

export interface OAuthProviderConfig {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
}

export class OAuthConfigService {
	private configs = new Map<AuthProvider, OAuthProviderConfig>();

	constructor() {
		this.loadConfigs();
	}

	private loadConfigs(): void {
		// Google OAuth (required)
		// Use SvelteKit's $env/dynamic/private for server-side environment variables
		// These are loaded from .env files by Vite automatically
		// Dynamic import allows variables to be optional (undefined if not set)
		const googleClientId = env.GOOGLE_CLIENT_ID;
		const googleClientSecret = env.GOOGLE_CLIENT_SECRET;
		const googleRedirectUri = env.GOOGLE_REDIRECT_URI;

		// Debug logging
		logger.info('OAuthConfigService: Loading OAuth configuration...');
		logger.debug('  GOOGLE_CLIENT_ID:', googleClientId ? 'SET' : 'NOT SET');
		logger.debug('  GOOGLE_CLIENT_SECRET:', googleClientSecret ? 'SET' : 'NOT SET');
		logger.debug('  GOOGLE_REDIRECT_URI:', googleRedirectUri || 'NOT SET');

		if (googleClientId && googleClientSecret && googleRedirectUri) {
			this.configs.set('google', {
				clientId: googleClientId,
				clientSecret: googleClientSecret,
				redirectUri: googleRedirectUri
			});
			logger.info('OAuthConfigService: Google OAuth configured successfully');
		} else {
			logger.warn(
				'OAuthConfigService: Google OAuth NOT configured - missing environment variables'
			);
			const missing: string[] = [];
			if (!googleClientId) missing.push('GOOGLE_CLIENT_ID');
			if (!googleClientSecret) missing.push('GOOGLE_CLIENT_SECRET');
			if (!googleRedirectUri) missing.push('GOOGLE_REDIRECT_URI');
			logger.warn(`OAuthConfigService: Missing variables: ${missing.join(', ')}`);
		}

		// Add more providers here in the future (Microsoft, GitHub, etc.)
	}

	getConfig(provider: AuthProvider): OAuthProviderConfig {
		const config = this.configs.get(provider);
		if (!config) {
			throw new Error(
				`OAuth provider '${provider}' is not configured. Check environment variables.`
			);
		}
		return config;
	}

	getAvailableProviders(): AuthProvider[] {
		return Array.from(this.configs.keys());
	}

	isProviderConfigured(provider: AuthProvider): boolean {
		return this.configs.has(provider);
	}
}
