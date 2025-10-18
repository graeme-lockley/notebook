import type { User, AuthProvider, UserId } from '$lib/server/domain/value-objects';
import type { UserReadModel } from '../../ports/inbound/user-read-model';
import type { UserRegisteredEvent, UserLoggedInEvent } from '$lib/server/domain/events/user.events';

export class InMemoryUserReadModel implements UserReadModel {
	private users = new Map<UserId, User>();
	private usersByProvider = new Map<string, User>(); // "provider:providerId" -> User
	private usersByEmail = new Map<string, User>(); // email -> User

	async getUserById(userId: UserId): Promise<User | null> {
		return this.users.get(userId) || null;
	}

	async getUserByProvider(provider: AuthProvider, providerId: string): Promise<User | null> {
		const key = `${provider}:${providerId}`;
		return this.usersByProvider.get(key) || null;
	}

	async getUserByEmail(email: string): Promise<User | null> {
		return this.usersByEmail.get(email) || null;
	}

	async getAllUsers(): Promise<User[]> {
		return Array.from(this.users.values());
	}

	// Methods called by projector
	handleUserRegistered(event: UserRegisteredEvent): void {
		const user: User = {
			id: event.payload.userId,
			email: event.payload.email,
			name: event.payload.name,
			picture: event.payload.picture,
			provider: event.payload.provider,
			providerId: event.payload.providerId,
			createdAt: new Date(event.payload.registeredAt),
			lastLoginAt: new Date(event.payload.registeredAt)
		};

		this.users.set(user.id, user);
		this.usersByProvider.set(`${user.provider}:${user.providerId}`, user);
		this.usersByEmail.set(user.email, user);
	}

	handleUserLoggedIn(event: UserLoggedInEvent): void {
		const user = this.users.get(event.payload.userId);
		if (user) {
			user.lastLoginAt = new Date(event.payload.loginAt);
		}
	}
}
