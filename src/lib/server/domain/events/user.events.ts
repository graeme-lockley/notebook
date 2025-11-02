import type { AuthProvider } from '$lib/server/domain/value-objects';

export interface UserRegisteredEvent {
	type: 'user.registered';
	payload: {
		userId: string;
		email: string;
		name: string;
		picture?: string;
		provider: AuthProvider;
		providerId: string;
		registeredAt: string; // ISO timestamp
	};
}

export interface UserLoggedInEvent {
	type: 'user.logged_in';
	payload: {
		userId: string;
		loginAt: string; // ISO timestamp
	};
}

export type UserEvent = UserRegisteredEvent | UserLoggedInEvent;
