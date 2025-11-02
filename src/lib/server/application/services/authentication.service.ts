import type { OAuthProviderRegistry } from './oauth-provider-registry';
import type { EventStore } from '$lib/server/application/ports/outbound/event-store';
import type { EventBus } from '$lib/server/application/ports/outbound/event-bus';
import type { UserReadModel } from '$lib/server/application/ports/inbound/user-read-model';
import type { AuthProvider, User } from '$lib/server/domain/value-objects';
import type { ProviderUserInfo } from '$lib/server/application/ports/outbound/oauth-provider';
import { UserEventFactory } from './user-event-factory';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

export interface AuthenticationResult {
	user: User;
	isNewUser: boolean;
}

export class AuthenticationService {
	constructor(
		private providerRegistry: OAuthProviderRegistry,
		private eventStore: EventStore,
		private eventBus: EventBus,
		private userReadModel: UserReadModel
	) {}

	getAuthorizationUrl(provider: AuthProvider, state: string, redirectUri: string): string {
		logger.info(`AuthenticationService: Getting authorization URL for ${provider}`);
		const oauthProvider = this.providerRegistry.getProvider(provider);
		return oauthProvider.getAuthorizationUrl(state, redirectUri);
	}

	async authenticateUser(
		provider: AuthProvider,
		code: string,
		redirectUri: string
	): Promise<AuthenticationResult> {
		logger.info(`AuthenticationService: Authenticating user with ${provider}`);

		// 1. Get provider and exchange code for token
		const oauthProvider = this.providerRegistry.getProvider(provider);
		const token = await oauthProvider.exchangeCodeForToken(code, redirectUri);

		// 2. Get user info from provider
		const providerUserInfo = await oauthProvider.getUserInfo(token.accessToken);
		logger.info(`AuthenticationService: Got user info from ${provider}: ${providerUserInfo.email}`);

		// 3. Check if user exists by provider ID (single source of truth)
		let user = await this.userReadModel.getUserByProvider(provider, providerUserInfo.id);
		let isNewUser = false;

		if (!user) {
			// 4. User doesn't exist - create new user
			logger.info(`AuthenticationService: Creating new user for ${providerUserInfo.email}`);
			user = await this.createNewUser(providerUserInfo, provider);
			isNewUser = true;
		} else {
			// 5. User exists - create login event
			logger.info(`AuthenticationService: User ${user.id} logged in`);
			await this.createLoginEvent(user.id);
		}

		return { user, isNewUser };
	}

	private async createNewUser(
		providerUserInfo: ProviderUserInfo,
		provider: AuthProvider
	): Promise<User> {
		// Create user registered event
		const event = UserEventFactory.createUserRegisteredEvent(providerUserInfo, provider);

		// Publish to event store
		await this.eventStore.publishEvent('users', event.type, event.payload);

		// Publish to event bus (for projectors to update read models)
		await this.eventBus.publish({
			id: event.payload.userId,
			type: event.type,
			payload: event.payload,
			timestamp: new Date(),
			aggregateId: event.payload.userId
		});

		logger.info(`AuthenticationService: User registered: ${event.payload.userId}`);

		// Retrieve newly created user from read model
		const user = await this.userReadModel.getUserByProvider(provider, providerUserInfo.id);
		if (!user) {
			throw new Error('Failed to retrieve newly created user');
		}

		return user;
	}

	private async createLoginEvent(userId: string): Promise<void> {
		const event = UserEventFactory.createUserLoggedInEvent(userId);

		// Publish to event store
		await this.eventStore.publishEvent('users', event.type, event.payload);

		// Publish to event bus
		await this.eventBus.publish({
			id: userId,
			type: event.type,
			payload: event.payload,
			timestamp: new Date(),
			aggregateId: userId
		});
	}
}
