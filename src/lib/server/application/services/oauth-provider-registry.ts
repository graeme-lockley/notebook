import type { OAuthProvider } from '../ports/outbound/oauth-provider';
import type { AuthProvider } from '$lib/server/domain/value-objects';

export class OAuthProviderRegistry {
	private providers = new Map<AuthProvider, OAuthProvider>();

	constructor(providers: OAuthProvider[]) {
		providers.forEach((provider) => {
			this.providers.set(provider.name, provider);
		});
	}

	getProvider(name: AuthProvider): OAuthProvider {
		const provider = this.providers.get(name);
		if (!provider) {
			throw new Error(`OAuth provider '${name}' not registered`);
		}
		return provider;
	}

	getAvailableProviders(): AuthProvider[] {
		return Array.from(this.providers.keys());
	}

	hasProvider(name: AuthProvider): boolean {
		return this.providers.has(name);
	}
}
