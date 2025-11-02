import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionProjector } from './session-projector';
import { InMemorySessionReadModel } from '../adapters/inbound/in-memory-session-read-model';
import type { DomainEvent } from '../ports/outbound/event-bus';
import type { UserReadModel } from '../ports/inbound/user-read-model';

// Mock logger
vi.mock('$lib/common/infrastructure/logging/logger.service', () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn()
	}
}));

describe('SessionProjector', () => {
	let projector: SessionProjector;
	let readModel: InMemorySessionReadModel;
	let mockUserReadModel: UserReadModel;

	beforeEach(() => {
		mockUserReadModel = {
			getUserById: vi.fn()
		} as unknown as UserReadModel;
		readModel = new InMemorySessionReadModel(mockUserReadModel);
		projector = new SessionProjector(readModel);
	});

	describe('handle', () => {
		it('should handle session.created event', async () => {
			const now = new Date();
			const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

			const event: DomainEvent = {
				id: 'event-123',
				type: 'session.created',
				payload: {
					sessionId: 'session-123',
					userId: 'user-123',
					createdAt: now.toISOString(),
					expiresAt: futureDate.toISOString()
				},
				timestamp: new Date(),
				aggregateId: 'session-123'
			};

			await projector.handle(event);

			const session = await readModel.getSessionById('session-123');
			expect(session).toEqual({
				id: 'session-123',
				userId: 'user-123',
				createdAt: now,
				expiresAt: futureDate,
				lastAccessedAt: now
			});
		});

		it('should handle session.expired event', async () => {
			const now = new Date();
			const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

			// First create a session
			const createEvent: DomainEvent = {
				id: 'event-1',
				type: 'session.created',
				payload: {
					sessionId: 'session-123',
					userId: 'user-123',
					createdAt: now.toISOString(),
					expiresAt: futureDate.toISOString()
				},
				timestamp: new Date(),
				aggregateId: 'session-123'
			};

			await projector.handle(createEvent);

			// Then expire it
			const expireEvent: DomainEvent = {
				id: 'event-2',
				type: 'session.expired',
				payload: {
					sessionId: 'session-123',
					expiredAt: new Date().toISOString()
				},
				timestamp: new Date(),
				aggregateId: 'session-123'
			};

			await projector.handle(expireEvent);

			const session = await readModel.getSessionById('session-123');
			expect(session).toBeNull();
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
			const sessions = await readModel.getActiveSessionsByUserId('user-123');
			expect(sessions).toEqual([]);
		});
	});
});
