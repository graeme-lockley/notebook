import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserProjector } from './user-projector';
import { InMemoryUserReadModel } from '../adapters/inbound/in-memory-user-read-model';
import type { DomainEvent } from '../ports/outbound/event-bus';

// Mock logger
vi.mock('$lib/common/infrastructure/logging/logger.service', () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn()
	}
}));

describe('UserProjector', () => {
	let projector: UserProjector;
	let readModel: InMemoryUserReadModel;

	beforeEach(() => {
		readModel = new InMemoryUserReadModel();
		projector = new UserProjector(readModel);
	});

	describe('handle', () => {
		it('should handle user.registered event', async () => {
			const event: DomainEvent = {
				id: 'event-123',
				type: 'user.registered',
				payload: {
					userId: 'user-123',
					email: 'test@example.com',
					name: 'Test User',
					picture: 'https://example.com/avatar.jpg',
					provider: 'google',
					providerId: 'google-123',
					registeredAt: '2023-01-01T00:00:00Z'
				},
				timestamp: new Date(),
				aggregateId: 'user-123'
			};

			await projector.handle(event);

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

		it('should handle user.logged_in event', async () => {
			// First register a user
			const registerEvent: DomainEvent = {
				id: 'event-1',
				type: 'user.registered',
				payload: {
					userId: 'user-123',
					email: 'test@example.com',
					name: 'Test User',
					provider: 'google',
					providerId: 'google-123',
					registeredAt: '2023-01-01T00:00:00Z'
				},
				timestamp: new Date(),
				aggregateId: 'user-123'
			};

			await projector.handle(registerEvent);

			// Then handle login event
			const loginEvent: DomainEvent = {
				id: 'event-2',
				type: 'user.logged_in',
				payload: {
					userId: 'user-123',
					loginAt: '2023-01-02T12:00:00Z'
				},
				timestamp: new Date(),
				aggregateId: 'user-123'
			};

			await projector.handle(loginEvent);

			const user = await readModel.getUserById('user-123');
			expect(user?.lastLoginAt).toEqual(new Date('2023-01-02T12:00:00Z'));
		});

		it('should ignore unknown event types', async () => {
			const event: DomainEvent = {
				id: 'event-123',
				type: 'unknown.event',
				payload: { some: 'data' },
				timestamp: new Date(),
				aggregateId: 'unknown'
			};

			await projector.handle(event);

			// Should not affect read model
			const users = await readModel.getAllUsers();
			expect(users).toEqual([]);
		});
	});
});
