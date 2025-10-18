import type { EventStore } from '$lib/server/application/ports/outbound/event-store';
import type { EventBus } from '$lib/server/application/ports/outbound/event-bus';
import type { SessionReadModel } from '$lib/server/application/ports/inbound/session-read-model';
import type { UserId, SessionId, User } from '$lib/server/domain/value-objects';
import { UserEventFactory } from './user-event-factory';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

export class SessionService {
	constructor(
		private eventStore: EventStore,
		private eventBus: EventBus,
		private sessionReadModel: SessionReadModel
	) {}

	async createSession(userId: UserId): Promise<SessionId> {
		logger.info(`SessionService: Creating session for user ${userId}`);

		// Create session event
		const event = UserEventFactory.createSessionCreatedEvent(userId);

		// Publish to event store
		await this.eventStore.publishEvent('sessions', event.type, event.payload);

		// Publish to event bus (for projectors to update read models)
		await this.eventBus.publish({
			id: event.payload.sessionId,
			type: event.type,
			payload: event.payload,
			timestamp: new Date(),
			aggregateId: event.payload.userId
		});

		logger.info(`SessionService: Session created: ${event.payload.sessionId}`);
		return event.payload.sessionId;
	}

	async validateSession(sessionId: SessionId): Promise<User | null> {
		logger.debug(`SessionService: Validating session ${sessionId}`);

		const user = await this.sessionReadModel.getUserBySessionId(sessionId);

		if (!user) {
			logger.debug(`SessionService: Session ${sessionId} is invalid or expired`);
			return null;
		}

		logger.debug(`SessionService: Session ${sessionId} is valid for user ${user.id}`);
		return user;
	}

	async invalidateSession(sessionId: SessionId): Promise<void> {
		logger.info(`SessionService: Invalidating session ${sessionId}`);

		const event = {
			type: 'session.expired',
			payload: {
				sessionId,
				expiredAt: new Date().toISOString()
			}
		};

		await this.eventStore.publishEvent('sessions', event.type, event.payload);

		// Publish to event bus
		await this.eventBus.publish({
			id: sessionId,
			type: event.type,
			payload: event.payload,
			timestamp: new Date(),
			aggregateId: sessionId
		});

		logger.info(`SessionService: Session invalidated: ${sessionId}`);
	}
}
