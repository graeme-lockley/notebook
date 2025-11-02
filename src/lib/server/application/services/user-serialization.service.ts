import type { User, AuthProvider } from '$lib/server/domain/value-objects';

/**
 * Serialized user type for client-side consumption
 * Date objects are converted to ISO strings for JSON serialization
 * Note: provider remains AuthProvider type (not string) for type safety
 */
export interface SerializedUser {
	id: string;
	email: string;
	name: string;
	picture?: string;
	provider: AuthProvider;
	providerId: string;
	createdAt: string; // ISO string
	lastLoginAt: string; // ISO string
}

/**
 * Service for serializing domain User objects for client consumption
 * Consolidates Date serialization logic that was duplicated across routes
 */
export class UserSerializationService {
	/**
	 * Serializes a User domain object for client-side consumption
	 * Converts Date objects to ISO strings for JSON serialization
	 */
	serializeForClient(user: User | null): SerializedUser | null {
		if (!user) {
			return null;
		}

		return {
			...user,
			createdAt: user.createdAt.toISOString(),
			lastLoginAt: user.lastLoginAt.toISOString()
		};
	}
}
