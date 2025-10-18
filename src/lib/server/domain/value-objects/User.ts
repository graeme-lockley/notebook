import type { UserId } from './UserId';

export type AuthProvider = 'google' | 'microsoft' | 'github' | 'apple';

export interface User {
	id: UserId;
	email: string;
	name: string;
	picture?: string;
	provider: AuthProvider;
	providerId: string; // Provider's unique ID for this user
	createdAt: Date;
	lastLoginAt: Date;
}
