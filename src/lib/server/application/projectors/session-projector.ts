import type { EventHandler, DomainEvent } from '../ports/outbound/event-bus';
import type { InMemorySessionReadModel } from '../adapters/inbound/in-memory-session-read-model';
import type {
	SessionCreatedEvent,
	SessionExpiredEvent
} from '$lib/server/domain/events/session.events';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

export class SessionProjector implements EventHandler {
	constructor(private readModel: InMemorySessionReadModel) {}

	async handle(event: DomainEvent): Promise<void> {
		logger.debug(`SessionProjector: Handling event: ${event.type}`);

		switch (event.type) {
			case 'session.created':
				this.readModel.handleSessionCreated(event as SessionCreatedEvent);
				logger.info(
					`SessionProjector: Session created: ${(event.payload as { sessionId: string }).sessionId}`
				);
				break;
			case 'session.expired':
				this.readModel.handleSessionExpired(event as SessionExpiredEvent);
				logger.info(
					`SessionProjector: Session expired: ${(event.payload as { sessionId: string }).sessionId}`
				);
				break;
			default:
				logger.debug(`SessionProjector: Ignoring event type: ${event.type}`);
		}
	}
}
