import type { EventHandler, DomainEvent } from '../ports/outbound/event-bus';
import type { InMemoryUserReadModel } from '../adapters/inbound/in-memory-user-read-model';
import type { UserRegisteredEvent, UserLoggedInEvent } from '$lib/server/domain/events/user.events';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

export class UserProjector implements EventHandler {
	constructor(private readModel: InMemoryUserReadModel) {}

	async handle(event: DomainEvent): Promise<void> {
		logger.debug(`UserProjector: Handling event: ${event.type}`);

		switch (event.type) {
			case 'user.registered':
				this.readModel.handleUserRegistered(event as UserRegisteredEvent);
				logger.info(
					`UserProjector: User registered: ${(event.payload as { userId: string }).userId}`
				);
				break;
			case 'user.logged_in':
				this.readModel.handleUserLoggedIn(event as UserLoggedInEvent);
				logger.debug(
					`UserProjector: User logged in: ${(event.payload as { userId: string }).userId}`
				);
				break;
			default:
				logger.debug(`UserProjector: Ignoring event type: ${event.type}`);
		}
	}
}
