import type { WebSocketService, WebSocketConnection } from '../../ports/outbound/websocket-service';
import type { NotebookProjectionManager } from '../../services/notebook-projection-manager';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

export class SvelteKitWebSocketService implements WebSocketService {
	private connections: Map<string, WebSocketConnection> = new Map();
	private notebookConnections: Map<string, Set<string>> = new Map();

	constructor(private projectionManager: NotebookProjectionManager) {
		// Set up periodic cleanup of dead connections
		setInterval(() => {
			this.cleanupDeadConnections();
		}, 30000); // Clean up every 30 seconds
	}

	async addConnection(connection: WebSocketConnection): Promise<void> {
		// Acquire projection for this notebook
		await this.projectionManager.acquireProjection(connection.notebookId);

		this.connections.set(connection.id, connection);

		// Track connections per notebook
		if (!this.notebookConnections.has(connection.notebookId)) {
			this.notebookConnections.set(connection.notebookId, new Set());
		}
		this.notebookConnections.get(connection.notebookId)!.add(connection.id);

		logger.info(
			`WebSocket connection added: ${connection.id} for notebook ${connection.notebookId} (projection acquired)`
		);
	}

	async removeConnection(connectionId: string): Promise<void> {
		const connection = this.connections.get(connectionId);
		if (connection) {
			// Release projection for this notebook
			await this.projectionManager.releaseProjection(connection.notebookId);

			// Remove from notebook tracking
			const notebookConnections = this.notebookConnections.get(connection.notebookId);
			if (notebookConnections) {
				notebookConnections.delete(connectionId);
				if (notebookConnections.size === 0) {
					this.notebookConnections.delete(connection.notebookId);
				}
			}

			// Remove from main connections map
			this.connections.delete(connectionId);
			logger.info(
				`WebSocket connection removed: ${connectionId} (projection released for notebook ${connection.notebookId})`
			);
		}
	}

	broadcastToNotebook(notebookId: string, event: unknown): void {
		const notebookConnections = this.notebookConnections.get(notebookId);
		if (!notebookConnections || notebookConnections.size === 0) {
			return;
		}

		const message = JSON.stringify(event);
		let successCount = 0;
		let errorCount = 0;

		for (const connectionId of notebookConnections) {
			const connection = this.connections.get(connectionId);
			if (connection && connection.isAlive) {
				try {
					connection.send(message);
					successCount++;
				} catch (error) {
					logger.error(`Failed to send message to connection ${connectionId}:`, error);
					connection.isAlive = false;
					errorCount++;
				}
			}
		}

		if (successCount > 0) {
			logger.info(`Broadcasted to ${successCount} connections for notebook ${notebookId}`);
		}
		if (errorCount > 0) {
			logger.warn(
				`Failed to broadcast to ${errorCount} dead connections for notebook ${notebookId}`
			);
		}
	}

	broadcastToAll(event: unknown): void {
		const message = JSON.stringify(event);
		let successCount = 0;
		let errorCount = 0;

		for (const [connectionId, connection] of this.connections) {
			if (connection.isAlive) {
				try {
					connection.send(message);
					successCount++;
				} catch (error) {
					logger.error(`Failed to send message to connection ${connectionId}:`, error);
					connection.isAlive = false;
					errorCount++;
				}
			}
		}

		if (successCount > 0) {
			logger.info(`Broadcasted to ${successCount} total connections`);
		}
		if (errorCount > 0) {
			logger.warn(`Failed to broadcast to ${errorCount} dead connections`);
		}
	}

	getConnectionsForNotebook(notebookId: string): WebSocketConnection[] {
		const notebookConnections = this.notebookConnections.get(notebookId);
		if (!notebookConnections) {
			return [];
		}

		const connections: WebSocketConnection[] = [];
		for (const connectionId of notebookConnections) {
			const connection = this.connections.get(connectionId);
			if (connection && connection.isAlive) {
				connections.push(connection);
			}
		}

		return connections;
	}

	getAllConnections(): WebSocketConnection[] {
		const connections: WebSocketConnection[] = [];
		for (const [, connection] of this.connections) {
			if (connection.isAlive) {
				connections.push(connection);
			}
		}
		return connections;
	}

	pingConnection(connectionId: string): boolean {
		const connection = this.connections.get(connectionId);
		if (connection && connection.isAlive) {
			try {
				connection.send(JSON.stringify({ type: 'ping' }));
				return true;
			} catch (error) {
				logger.error(`Failed to ping connection ${connectionId}:`, error);
				connection.isAlive = false;
				return false;
			}
		}
		return false;
	}

	cleanupDeadConnections(): void {
		const deadConnections: string[] = [];

		for (const [connectionId, connection] of this.connections) {
			if (!connection.isAlive) {
				deadConnections.push(connectionId);
			}
		}

		for (const deadConnectionId of deadConnections) {
			this.removeConnection(deadConnectionId);
		}

		if (deadConnections.length > 0) {
			logger.info(`Cleaned up ${deadConnections.length} dead connections`);
		}
	}
}
