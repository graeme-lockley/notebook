// Standalone WebSocket Broadcaster
// Sends events to the standalone WebSocket server running on port 3001

import { logger } from '$lib/server/infrastructure/logging/logger.service';

export class StandaloneWebSocketBroadcaster {
	private readonly wsServerUrl: string;

	constructor(wsServerUrl: string = 'http://localhost:3001') {
		this.wsServerUrl = wsServerUrl;
	}

	/**
	 * Broadcast an event to all connected clients for a specific notebook
	 */
	public async broadcastToNotebook(notebookId: string, event: unknown): Promise<void> {
		try {
			const response = await fetch(`${this.wsServerUrl}/broadcast`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					notebookId,
					event
				})
			});

			if (!response.ok) {
				logger.error(`Failed to broadcast to notebook ${notebookId}: ${response.statusText}`);
			} else {
				logger.debug(`Successfully broadcasted event to notebook ${notebookId}`);
			}
		} catch (error) {
			logger.error(`Error broadcasting to notebook ${notebookId}:`, error);
		}
	}

	/**
	 * Broadcast initialization message to a specific notebook
	 */
	public async broadcastInitialization(notebookId: string, cells: unknown[]): Promise<void> {
		const event = {
			type: 'notebook.initialized',
			data: {
				notebookId,
				cells,
				timestamp: Date.now()
			}
		};

		await this.broadcastToNotebook(notebookId, event);
	}

	/**
	 * Broadcast a custom event to a specific notebook
	 */
	public async broadcastCustomEvent(
		notebookId: string,
		eventType: string,
		data: unknown
	): Promise<void> {
		const event = {
			type: eventType,
			data: {
				notebookId,
				...(typeof data === 'object' && data !== null ? data : {}),
				timestamp: Date.now()
			}
		};

		await this.broadcastToNotebook(notebookId, event);
	}

	/**
	 * Get connection statistics (placeholder - would need to implement in standalone server)
	 */
	public getStats(): {
		totalConnections: number;
		notebooksWithConnections: number;
		connectionsByNotebook: Record<string, number>;
	} {
		// This would need to be implemented in the standalone server
		return {
			totalConnections: 0,
			notebooksWithConnections: 0,
			connectionsByNotebook: {}
		};
	}
}
