import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemorySessionReadModel } from './in-memory-session-read-model';
import type {
	SessionCreatedEvent,
	SessionExpiredEvent
} from '$lib/server/domain/events/session.events';
import type { User } from '$lib/server/domain/value-objects';
import type { UserReadModel } from '../../ports/inbound/user-read-model';

describe('InMemorySessionReadModel', () => {
	let readModel: InMemorySessionReadModel;
	let mockUserReadModel: UserReadModel;

	beforeEach(() => {
		mockUserReadModel = {
			getUserById: vi.fn()
		} as unknown as UserReadModel;
		readModel = new InMemorySessionReadModel(mockUserReadModel);
	});

	describe('getSessionById', () => {
		it('should return null for non-existent session', async () => {
			const session = await readModel.getSessionById('non-existent');
			expect(session).toBeNull();
		});

		it('should return null for expired session', async () => {
			const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
			const event: SessionCreatedEvent = {
				type: 'session.created',
				payload: {
					sessionId: 'session-123',
					userId: 'user-123',
					createdAt: pastDate.toISOString(),
					expiresAt: pastDate.toISOString() // Already expired
				}
			};

			readModel.handleSessionCreated(event);
			const session = await readModel.getSessionById('session-123');

			expect(session).toBeNull();
		});

		it('should return valid session', async () => {
			const now = new Date();
			const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

			const event: SessionCreatedEvent = {
				type: 'session.created',
				payload: {
					sessionId: 'session-123',
					userId: 'user-123',
					createdAt: now.toISOString(),
					expiresAt: futureDate.toISOString()
				}
			};

			readModel.handleSessionCreated(event);
			const session = await readModel.getSessionById('session-123');

			expect(session).toEqual({
				id: 'session-123',
				userId: 'user-123',
				createdAt: now,
				expiresAt: futureDate,
				lastAccessedAt: now
			});
		});
	});

	describe('getUserBySessionId', () => {
		it('should return null for non-existent session', async () => {
			const user = await readModel.getUserBySessionId('non-existent');
			expect(user).toBeNull();
		});

		it('should return null for expired session', async () => {
			const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
			const event: SessionCreatedEvent = {
				type: 'session.created',
				payload: {
					sessionId: 'session-123',
					userId: 'user-123',
					createdAt: pastDate.toISOString(),
					expiresAt: pastDate.toISOString()
				}
			};

			readModel.handleSessionCreated(event);
			const user = await readModel.getUserBySessionId('session-123');

			expect(user).toBeNull();
		});

		it('should return user for valid session', async () => {
			const now = new Date();
			const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
			const mockUser: User = {
				id: 'user-123',
				email: 'test@example.com',
				name: 'Test User',
				provider: 'google',
				providerId: 'google-123',
				createdAt: now,
				lastLoginAt: now
			};

			(mockUserReadModel.getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

			const event: SessionCreatedEvent = {
				type: 'session.created',
				payload: {
					sessionId: 'session-123',
					userId: 'user-123',
					createdAt: now.toISOString(),
					expiresAt: futureDate.toISOString()
				}
			};

			readModel.handleSessionCreated(event);
			const user = await readModel.getUserBySessionId('session-123');

			expect(user).toEqual(mockUser);
			expect(mockUserReadModel.getUserById).toHaveBeenCalledWith('user-123');
		});
	});

	describe('getActiveSessionsByUserId', () => {
		it('should return empty array for user with no sessions', async () => {
			const sessions = await readModel.getActiveSessionsByUserId('user-123');
			expect(sessions).toEqual([]);
		});

		it('should return only active sessions for user', async () => {
			const now = new Date();
			const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
			const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

			// Active session
			const activeEvent: SessionCreatedEvent = {
				type: 'session.created',
				payload: {
					sessionId: 'session-active',
					userId: 'user-123',
					createdAt: now.toISOString(),
					expiresAt: futureDate.toISOString()
				}
			};

			// Expired session
			const expiredEvent: SessionCreatedEvent = {
				type: 'session.created',
				payload: {
					sessionId: 'session-expired',
					userId: 'user-123',
					createdAt: pastDate.toISOString(),
					expiresAt: pastDate.toISOString()
				}
			};

			// Session for different user
			const otherUserEvent: SessionCreatedEvent = {
				type: 'session.created',
				payload: {
					sessionId: 'session-other',
					userId: 'user-456',
					createdAt: now.toISOString(),
					expiresAt: futureDate.toISOString()
				}
			};

			readModel.handleSessionCreated(activeEvent);
			readModel.handleSessionCreated(expiredEvent);
			readModel.handleSessionCreated(otherUserEvent);

			const sessions = await readModel.getActiveSessionsByUserId('user-123');
			expect(sessions).toHaveLength(1);
			expect(sessions[0].id).toBe('session-active');
		});
	});

	describe('handleSessionExpired', () => {
		it('should remove session when expired', async () => {
			const now = new Date();
			const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

			const createEvent: SessionCreatedEvent = {
				type: 'session.created',
				payload: {
					sessionId: 'session-123',
					userId: 'user-123',
					createdAt: now.toISOString(),
					expiresAt: futureDate.toISOString()
				}
			};

			const expireEvent: SessionExpiredEvent = {
				type: 'session.expired',
				payload: {
					sessionId: 'session-123',
					expiredAt: new Date().toISOString()
				}
			};

			readModel.handleSessionCreated(createEvent);
			readModel.handleSessionExpired(expireEvent);

			const session = await readModel.getSessionById('session-123');
			expect(session).toBeNull();
		});
	});
});
