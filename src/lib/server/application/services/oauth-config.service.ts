import type { AuthProvider } from '$lib/server/domain/value-objects';

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
		const googleClientId = process.env.GOOGLE_CLIENT_ID;
		const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
		const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI;

		if (googleClientId && googleClientSecret && googleRedirectUri) {
			this.configs.set('google', {
				clientId: googleClientId,
				clientSecret: googleClientSecret,
				redirectUri: googleRedirectUri
			});
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
