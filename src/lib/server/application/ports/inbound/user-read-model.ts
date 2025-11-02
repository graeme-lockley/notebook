import type { User, AuthProvider, UserId } from '$lib/server/domain/value-objects';

export interface UserReadModel {
	getUserById(userId: UserId): Promise<User | null>;
	getUserByProvider(provider: AuthProvider, providerId: string): Promise<User | null>;
	getUserByEmail(email: string): Promise<User | null>;
	getAllUsers(): Promise<User[]>;
}
