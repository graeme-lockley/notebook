import type { EventHandler, DomainEvent } from '../ports/outbound/event-bus';
import type { WebSocketService } from '../ports/outbound/websocket-service';
import { logger } from '$lib/server/infrastructure/logging/logger.service';

export class WebSocketProjector implements EventHandler {
	constructor(private webSocketService: WebSocketService) {}

	async handle(event: DomainEvent): Promise<void> {
		try {
			logger.info(`WebSocketProjector: Received event: ${event.type}`, event);

			// Determine the notebook ID from the event
			const notebookId = this.extractNotebookId(event);
			if (!notebookId) {
				logger.warn(`WebSocketProjector: Could not extract notebook ID from event:`, event);
				return;
			}

			// Create a standardized event format for the client
			const clientEvent = {
				type: event.type,
				payload: event.payload,
				timestamp: event.timestamp,
				eventId: event.id
			};

			logger.info(
				`WebSocketProjector: Broadcasting ${event.type} to notebook ${notebookId}:`,
				clientEvent
			);

			// Broadcast to all connections for this notebook
			this.webSocketService.broadcastToNotebook(notebookId, clientEvent);

			logger.info(`WebSocketProjector: Broadcasted ${event.type} event to notebook ${notebookId}`);
		} catch (error) {
			logger.error('WebSocketProjector: Error broadcasting event:', error);
		}
	}

	private extractNotebookId(event: DomainEvent): string | null {
		// For notebook events, the aggregateId is the notebook ID
		if (event.aggregateId) {
			return event.aggregateId;
		}

		// For cell events, try to extract from payload
		if (event.payload && typeof event.payload === 'object') {
			const payload = event.payload as Record<string, unknown>;
			if (payload.notebookId) {
				return payload.notebookId as string;
			}
		}

		return null;
	}
}
