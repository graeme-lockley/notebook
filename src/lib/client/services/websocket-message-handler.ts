import { logger } from '$lib/common/infrastructure/logging/logger.service';

/**
 * WebSocket message structure
 */
export interface WebSocketMessage {
	type: string;
	data?: unknown;
	payload?: unknown;
	eventId?: string;
}

/**
 * Handler function for WebSocket messages
 */
export type MessageHandler = (message: WebSocketMessage) => Promise<void> | void;

/**
 * WebSocketMessageHandler - Routes and handles WebSocket messages
 *
 * Responsibilities:
 * - Parsing and validating incoming WebSocket messages
 * - Routing messages to appropriate handlers based on type
 * - Error handling for message processing
 */
export class WebSocketMessageHandler {
	private handlers: Map<string, MessageHandler[]> = new Map();

	/**
	 * Registers a handler for a specific message type
	 * @param messageType - Type of message to handle (e.g., 'cell.created')
	 * @param handler - Handler function
	 * @returns Unsubscribe function
	 */
	registerHandler(messageType: string, handler: MessageHandler): () => void {
		if (!this.handlers.has(messageType)) {
			this.handlers.set(messageType, []);
		}

		const handlers = this.handlers.get(messageType)!;
		handlers.push(handler);

		// Return unsubscribe function
		return () => {
			const index = handlers.indexOf(handler);
			if (index > -1) {
				handlers.splice(index, 1);
			}
		};
	}

	/**
	 * Handles an incoming WebSocket message
	 * @param rawData - Raw data from WebSocket
	 */
	async handleMessage(rawData: unknown): Promise<void> {
		try {
			const message = this.validateMessage(rawData);
			await this.routeMessage(message);
		} catch (err) {
			logger.error('Error handling WebSocket message:', err);
		}
	}

	/**
	 * Validates that the raw data is a valid WebSocket message
	 * @param data - Raw data to validate
	 * @returns Validated WebSocket message
	 * @throws Error if validation fails
	 * @private
	 */
	private validateMessage(data: unknown): WebSocketMessage {
		if (typeof data !== 'object' || data === null || !('type' in data)) {
			throw new Error('Invalid WebSocket message format: missing type field');
		}

		return data as WebSocketMessage;
	}

	/**
	 * Routes a message to its registered handlers
	 * @param message - Validated WebSocket message
	 * @private
	 */
	private async routeMessage(message: WebSocketMessage): Promise<void> {
		const handlers = this.handlers.get(message.type);

		if (!handlers || handlers.length === 0) {
			logger.info('No handler registered for message type:', message.type);
			return;
		}

		// Call all handlers for this message type
		const promises = handlers.map(async (handler) => {
			try {
				await handler(message);
			} catch (err) {
				logger.error(`Error in handler for message type ${message.type}:`, err);
			}
		});

		await Promise.all(promises);
	}

	/**
	 * Unregisters all handlers for a specific message type
	 * @param messageType - Type of message to clear handlers for
	 */
	clearHandlers(messageType: string): void {
		this.handlers.delete(messageType);
	}

	/**
	 * Unregisters all handlers
	 */
	clearAllHandlers(): void {
		this.handlers.clear();
	}

	/**
	 * Gets the number of handlers registered for a message type
	 * @param messageType - Type of message to check
	 * @returns Number of handlers registered
	 */
	getHandlerCount(messageType: string): number {
		return this.handlers.get(messageType)?.length || 0;
	}
}
