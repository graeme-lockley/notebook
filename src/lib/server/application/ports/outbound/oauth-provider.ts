import type { AuthProvider } from '$lib/server/domain/value-objects';

export interface OAuthProvider {
	readonly name: AuthProvider;

	getAuthorizationUrl(state: string, redirectUri: string): string;
	exchangeCodeForToken(code: string, redirectUri: string): Promise<ProviderToken>;
	getUserInfo(accessToken: string): Promise<ProviderUserInfo>;
}

export interface ProviderToken {
	accessToken: string;
	refreshToken?: string;
	expiresIn?: number;
	idToken?: string;
}

export interface ProviderUserInfo {
	id: string; // Provider's unique ID
	email: string;
	emailVerified: boolean;
	name: string;
	picture?: string;
}
