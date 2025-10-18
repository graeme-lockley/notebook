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
		this.client.setCredentials({ access_token: accessToken });

		const ticket = await this.client.verifyIdToken({
			idToken: accessToken,
			audience: this.client._clientId
		});

		const payload = ticket.getPayload();

		if (!payload) {
			throw new Error('Failed to get user info from Google');
		}

		if (!payload.email) {
			throw new Error('Email is required from Google user info');
		}

		return {
			id: payload.sub,
			email: payload.email,
			emailVerified: payload.email_verified || false,
			name: payload.name || payload.email,
			picture: payload.picture
		};
	}
}
