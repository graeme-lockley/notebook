import type { EventBus, DomainEvent, EventHandler } from '../../ports/outbound/event-bus';
import { logger } from '$lib/server/infrastructure/logging/logger.service';

export class SimpleEventBus implements EventBus {
	private handlers: Map<string, Set<EventHandler>> = new Map();

	subscribe(eventType: string, handler: EventHandler): void {
		if (!this.handlers.has(eventType)) {
			this.handlers.set(eventType, new Set());
		}
		this.handlers.get(eventType)!.add(handler);
		logger.info(`EventBus: Subscribed handler to event type: ${eventType}`);
	}

	unsubscribe(eventType: string, handler: EventHandler): void {
		const handlers = this.handlers.get(eventType);
		if (handlers) {
			handlers.delete(handler);
			if (handlers.size === 0) {
				this.handlers.delete(eventType);
			}
		}
		logger.info(`EventBus: Unsubscribed handler from event type: ${eventType}`);
	}

	async publish(event: DomainEvent): Promise<void> {
		const handlers = this.handlers.get(event.type);
		if (!handlers || handlers.size === 0) {
			logger.debug(`EventBus: No handlers for event type: ${event.type}`);
			return;
		}

		logger.info(`EventBus: Publishing event: ${event.type} to ${handlers.size} handlers`);

		// Execute all handlers in parallel
		const promises = Array.from(handlers).map(async (handler) => {
			try {
				await handler.handle(event);
			} catch (error) {
				logger.error(`EventBus: Error in handler for event ${event.type}:`, error);
				// Don't throw - let other handlers continue
			}
		});

		await Promise.all(promises);
	}

	async publishMany(events: DomainEvent[]): Promise<void> {
		logger.info(`EventBus: Publishing ${events.length} events`);

		// Publish events sequentially to maintain order
		for (const event of events) {
			await this.publish(event);
		}
	}
}
