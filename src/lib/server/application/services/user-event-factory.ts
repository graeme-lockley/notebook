import { generateUserId } from '$lib/server/domain/value-objects/UserId';
import { generateSessionId } from '$lib/server/domain/value-objects/SessionId';
import type { UserRegisteredEvent, UserLoggedInEvent } from '$lib/server/domain/events/user.events';
import type { SessionCreatedEvent } from '$lib/server/domain/events/session.events';
import type { ProviderUserInfo } from '../ports/outbound/oauth-provider';
import type { AuthProvider } from '$lib/server/domain/value-objects';

/**
 * Stateless event factory for user and session events.
 * Pure functions with no side effects (following NotebookEventFactory pattern).
 */
export class UserEventFactory {
	/**
	 * Create a user.registered event from provider user info
	 */
	static createUserRegisteredEvent(
		providerUserInfo: ProviderUserInfo,
		provider: AuthProvider
	): UserRegisteredEvent {
		if (!providerUserInfo.email || !providerUserInfo.id) {
			throw new Error('Email and provider ID are required');
		}

		if (!providerUserInfo.emailVerified) {
			throw new Error('Email must be verified');
		}

		const userId = generateUserId();

		return {
			type: 'user.registered',
			payload: {
				userId,
				email: providerUserInfo.email,
				name: providerUserInfo.name,
				picture: providerUserInfo.picture,
				provider,
				providerId: providerUserInfo.id,
				registeredAt: new Date().toISOString()
			}
		};
	}

	/**
	 * Create a user.logged_in event
	 */
	static createUserLoggedInEvent(userId: string): UserLoggedInEvent {
		if (!userId) {
			throw new Error('UserId is required');
		}

		return {
			type: 'user.logged_in',
			payload: {
				userId,
				loginAt: new Date().toISOString()
			}
		};
	}

	/**
	 * Create a session.created event
	 */
	static createSessionCreatedEvent(userId: string): SessionCreatedEvent {
		if (!userId) {
			throw new Error('UserId is required');
		}

		const sessionId = generateSessionId();
		const now = new Date();
		const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

		return {
			type: 'session.created',
			payload: {
				sessionId,
				userId,
				createdAt: now.toISOString(),
				expiresAt: expiresAt.toISOString()
			}
		};
	}
}
