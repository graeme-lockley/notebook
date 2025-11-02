import { OAuth2Client } from 'google-auth-library';
import type {
	OAuthProvider,
	ProviderToken,
	ProviderUserInfo
} from '../../../ports/outbound/oauth-provider';

export interface GoogleOAuthConfig {
	clientId: string;
	clientSecret: string;
}

export class GoogleOAuthProvider implements OAuthProvider {
	readonly name = 'google' as const;
	private client: OAuth2Client;

	constructor(config: GoogleOAuthConfig) {
		this.client = new OAuth2Client(config.clientId, config.clientSecret);
	}

	getAuthorizationUrl(state: string, redirectUri: string): string {
		const scopes = [
			'https://www.googleapis.com/auth/userinfo.email',
			'https://www.googleapis.com/auth/userinfo.profile',
			'openid'
		];

		const authUrl = this.client.generateAuthUrl({
			access_type: 'offline',
			scope: scopes,
			state,
			redirect_uri: redirectUri,
			prompt: 'consent'
		});

		return authUrl;
	}

	async exchangeCodeForToken(code: string, redirectUri: string): Promise<ProviderToken> {
		const { tokens } = await this.client.getToken({ code, redirect_uri: redirectUri });

		if (!tokens.access_token) {
			throw new Error('Failed to get access token from Google');
		}

		return {
			accessToken: tokens.access_token,
			refreshToken: tokens.refresh_token || undefined,
			expiresIn: tokens.expiry_date || undefined,
			idToken: tokens.id_token || undefined
		};
	}

	async getUserInfo(accessToken: string): Promise<ProviderUserInfo> {
		// Use the access token to call Google's userinfo API endpoint
		// This is the correct way to get user information with an access token
		const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		});

		if (!response.ok) {
			throw new Error(
				`Failed to get user info from Google: ${response.status} ${response.statusText}`
			);
		}

		const userInfo = await response.json();

		if (!userInfo.email) {
			throw new Error('Email is required from Google user info');
		}

		// Google's userinfo API returns 'id' but we need to use it as the provider user ID
		return {
			id: userInfo.id,
			email: userInfo.email,
			emailVerified: userInfo.verified_email || false,
			name: userInfo.name || userInfo.email,
			picture: userInfo.picture
		};
	}
}
