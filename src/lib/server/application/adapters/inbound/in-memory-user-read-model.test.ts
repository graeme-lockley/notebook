import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryUserReadModel } from './in-memory-user-read-model';
import type { UserRegisteredEvent, UserLoggedInEvent } from '$lib/server/domain/events/user.events';

describe('InMemoryUserReadModel', () => {
	let readModel: InMemoryUserReadModel;

	beforeEach(() => {
		readModel = new InMemoryUserReadModel();
	});

	describe('getUserById', () => {
		it('should return null for non-existent user', async () => {
			const user = await readModel.getUserById('non-existent');
			expect(user).toBeNull();
		});

		it('should return user after registration', async () => {
			const event: UserRegisteredEvent = {
				type: 'user.registered',
				payload: {
					userId: 'user-123',
					email: 'test@example.com',
					name: 'Test User',
					picture: 'https://example.com/avatar.jpg',
					provider: 'google',
					providerId: 'google-123',
					registeredAt: '2023-01-01T00:00:00Z'
				}
			};

			readModel.handleUserRegistered(event);
			const user = await readModel.getUserById('user-123');

			expect(user).toEqual({
				id: 'user-123',
				email: 'test@example.com',
				name: 'Test User',
				picture: 'https://example.com/avatar.jpg',
				provider: 'google',
				providerId: 'google-123',
				createdAt: new Date('2023-01-01T00:00:00Z'),
				lastLoginAt: new Date('2023-01-01T00:00:00Z')
			});
		});
	});

	describe('getUserByProvider', () => {
		it('should return null for non-existent provider', async () => {
			const user = await readModel.getUserByProvider('google', 'non-existent');
			expect(user).toBeNull();
		});

		it('should return user by provider', async () => {
			const event: UserRegisteredEvent = {
				type: 'user.registered',
				payload: {
					userId: 'user-123',
					email: 'test@example.com',
					name: 'Test User',
					provider: 'google',
					providerId: 'google-123',
					registeredAt: '2023-01-01T00:00:00Z'
				}
			};

			readModel.handleUserRegistered(event);
			const user = await readModel.getUserByProvider('google', 'google-123');

			expect(user?.id).toBe('user-123');
		});
	});

	describe('getUserByEmail', () => {
		it('should return null for non-existent email', async () => {
			const user = await readModel.getUserByEmail('nonexistent@example.com');
			expect(user).toBeNull();
		});

		it('should return user by email', async () => {
			const event: UserRegisteredEvent = {
				type: 'user.registered',
				payload: {
					userId: 'user-123',
					email: 'test@example.com',
					name: 'Test User',
					provider: 'google',
					providerId: 'google-123',
					registeredAt: '2023-01-01T00:00:00Z'
				}
			};

			readModel.handleUserRegistered(event);
			const user = await readModel.getUserByEmail('test@example.com');

			expect(user?.id).toBe('user-123');
		});
	});

	describe('getAllUsers', () => {
		it('should return empty array initially', async () => {
			const users = await readModel.getAllUsers();
			expect(users).toEqual([]);
		});

		it('should return all users', async () => {
			const event1: UserRegisteredEvent = {
				type: 'user.registered',
				payload: {
					userId: 'user-1',
					email: 'user1@example.com',
					name: 'User 1',
					provider: 'google',
					providerId: 'google-1',
					registeredAt: '2023-01-01T00:00:00Z'
				}
			};

			const event2: UserRegisteredEvent = {
				type: 'user.registered',
				payload: {
					userId: 'user-2',
					email: 'user2@example.com',
					name: 'User 2',
					provider: 'google',
					providerId: 'google-2',
					registeredAt: '2023-01-02T00:00:00Z'
				}
			};

			readModel.handleUserRegistered(event1);
			readModel.handleUserRegistered(event2);

			const users = await readModel.getAllUsers();
			expect(users).toHaveLength(2);
			expect(users.map((u) => u.id)).toContain('user-1');
			expect(users.map((u) => u.id)).toContain('user-2');
		});
	});

	describe('handleUserLoggedIn', () => {
		it('should update lastLoginAt for existing user', async () => {
			const registerEvent: UserRegisteredEvent = {
				type: 'user.registered',
				payload: {
					userId: 'user-123',
					email: 'test@example.com',
					name: 'Test User',
					provider: 'google',
					providerId: 'google-123',
					registeredAt: '2023-01-01T00:00:00Z'
				}
			};

			const loginEvent: UserLoggedInEvent = {
				type: 'user.logged_in',
				payload: {
					userId: 'user-123',
					loginAt: '2023-01-02T12:00:00Z'
				}
			};

			readModel.handleUserRegistered(registerEvent);
			readModel.handleUserLoggedIn(loginEvent);

			const user = await readModel.getUserById('user-123');
			expect(user?.lastLoginAt).toEqual(new Date('2023-01-02T12:00:00Z'));
		});

		it('should not affect non-existent user', async () => {
			const loginEvent: UserLoggedInEvent = {
				type: 'user.logged_in',
				payload: {
					userId: 'non-existent',
					loginAt: '2023-01-02T12:00:00Z'
				}
			};

			readModel.handleUserLoggedIn(loginEvent);

			const user = await readModel.getUserById('non-existent');
			expect(user).toBeNull();
		});
	});
});
