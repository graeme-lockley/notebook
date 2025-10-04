// WebSocket Server for Real-time Notebook Collaboration
// Provides bidirectional communication for notebook updates

import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '$lib/server/infrastructure/logging/logger.service';

export interface WebSocketMessage {
	type: string;
	data?: unknown;
	timestamp?: number;
}

export interface NotebookWebSocketConnection {
	ws: WebSocket;
	notebookId: string;
	connectedAt: Date;
	lastPing: Date;
}

export class NotebookWebSocketServer {
	private wss: WebSocketServer;
	private connections = new Map<string, Set<WebSocket>>(); // notebookId -> WebSocket[]
	private connectionDetails = new Map<WebSocket, NotebookWebSocketConnection>();
	private heartbeatInterval: NodeJS.Timeout | null = null;
	private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds

	constructor(port: number = 3001) {
		try {
			this.wss = new WebSocketServer({ port });
			this.setupServer();
			this.startHeartbeat();
		} catch (error) {
			logger.error(`Failed to start WebSocket server on port ${port}:`, error);
			throw error;
		}
	}

	private setupServer(): void {
		this.wss.on('connection', (ws, request) => {
			try {
				const url = new URL(request.url!, `http://${request.headers.host}`);
				const notebookId = url.searchParams.get('notebookId');

				if (!notebookId) {
					ws.close(1008, 'Notebook ID required');
					return;
				}

				this.addConnection(notebookId, ws);
				this.setupConnectionHandlers(ws, notebookId);
				this.sendInitialData(ws, notebookId);
			} catch (error) {
				logger.error('Error setting up WebSocket connection:', error);
				ws.close(1011, 'Internal server error');
			}
		});

		this.wss.on('error', (error) => {
			logger.error('WebSocket server error:', error);
		});

		logger.info(`WebSocket server started on port ${this.wss.options.port}`);
	}

	private addConnection(notebookId: string, ws: WebSocket): void {
		if (!this.connections.has(notebookId)) {
			this.connections.set(notebookId, new Set());
		}
		this.connections.get(notebookId)!.add(ws);

		const connection: NotebookWebSocketConnection = {
			ws,
			notebookId,
			connectedAt: new Date(),
			lastPing: new Date()
		};
		this.connectionDetails.set(ws, connection);

		logger.info(
			`WebSocket connected for notebook ${notebookId}. Total connections: ${this.getConnectionCount()}`
		);
	}

	private removeConnection(notebookId: string, ws: WebSocket): void {
		const connections = this.connections.get(notebookId);
		if (connections) {
			connections.delete(ws);
			if (connections.size === 0) {
				this.connections.delete(notebookId);
			}
		}
		this.connectionDetails.delete(ws);
		logger.info(
			`WebSocket disconnected for notebook ${notebookId}. Total connections: ${this.getConnectionCount()}`
		);
	}

	private setupConnectionHandlers(ws: WebSocket, notebookId: string): void {
		ws.on('message', (data) => {
			try {
				const message: WebSocketMessage = JSON.parse(data.toString());
				this.handleClientMessage(notebookId, message, ws);
			} catch (error) {
				logger.error('Invalid WebSocket message:', error);
				ws.send(
					JSON.stringify({
						type: 'error',
						data: { message: 'Invalid message format' }
					})
				);
			}
		});

		ws.on('close', (code, reason) => {
			logger.info(`WebSocket closed for notebook ${notebookId}: ${code} ${reason}`);
			this.removeConnection(notebookId, ws);
		});

		ws.on('error', (error) => {
			logger.error(`WebSocket error for notebook ${notebookId}:`, error);
			this.removeConnection(notebookId, ws);
		});

		ws.on('pong', () => {
			const connection = this.connectionDetails.get(ws);
			if (connection) {
				connection.lastPing = new Date();
			}
		});
	}

	private handleClientMessage(notebookId: string, message: WebSocketMessage, ws: WebSocket): void {
		const connection = this.connectionDetails.get(ws);
		if (connection) {
			connection.lastPing = new Date();
		}

		switch (message.type) {
			case 'ping':
				ws.send(
					JSON.stringify({
						type: 'pong',
						timestamp: Date.now()
					})
				);
				break;

			case 'event_ack':
				logger.debug(`Event acknowledgment received for notebook ${notebookId}:`, message.data);
				break;

			case 'client_ready':
				logger.info(`Client ready for notebook ${notebookId}`);
				ws.send(
					JSON.stringify({
						type: 'server_ready',
						data: { notebookId }
					})
				);
				break;

			default:
				logger.warn(`Unknown message type from client: ${message.type}`);
				ws.send(
					JSON.stringify({
						type: 'error',
						data: { message: `Unknown message type: ${message.type}` }
					})
				);
		}
	}

	private sendInitialData(ws: WebSocket, notebookId: string): void {
		// Send initial connection confirmation
		ws.send(
			JSON.stringify({
				type: 'connected',
				data: {
					notebookId,
					timestamp: Date.now()
				}
			})
		);
	}

	private startHeartbeat(): void {
		this.heartbeatInterval = setInterval(() => {
			const now = new Date();
			const timeoutThreshold = new Date(now.getTime() - 60000); // 1 minute timeout

			const deadConnections: WebSocket[] = [];

			this.connectionDetails.forEach((connection, ws) => {
				if (connection.lastPing < timeoutThreshold) {
					logger.warn(`WebSocket heartbeat timeout for notebook ${connection.notebookId}`);
					deadConnections.push(ws);
				} else if (ws.readyState === WebSocket.OPEN) {
					ws.ping();
				}
			});

			// Clean up dead connections
			deadConnections.forEach((ws) => {
				const connection = this.connectionDetails.get(ws);
				if (connection) {
					this.removeConnection(connection.notebookId, ws);
					ws.terminate();
				}
			});
		}, this.HEARTBEAT_INTERVAL);
	}

	// Public methods for broadcasting events

	/**
	 * Broadcast an event to all connected clients for a specific notebook
	 */
	public broadcastToNotebook(notebookId: string, event: unknown): void {
		const connections = this.connections.get(notebookId);
		if (!connections || connections.size === 0) {
			logger.debug(`No connections for notebook ${notebookId}`);
			return;
		}

		const message = JSON.stringify(event);
		const deadConnections: WebSocket[] = [];

		connections.forEach((ws) => {
			if (ws.readyState === WebSocket.OPEN) {
				try {
					ws.send(message);
				} catch (error) {
					logger.error('Error sending WebSocket message:', error);
					deadConnections.push(ws);
				}
			} else {
				deadConnections.push(ws);
			}
		});

		// Clean up dead connections
		deadConnections.forEach((ws) => {
			const connection = this.connectionDetails.get(ws);
			if (connection) {
				this.removeConnection(connection.notebookId, ws);
			}
		});

		logger.debug(
			`Broadcasted event to ${connections.size - deadConnections.length} clients for notebook ${notebookId}`
		);
	}

	/**
	 * Broadcast an event to all connected clients across all notebooks
	 */
	public broadcastToAll(event: unknown): void {
		const message = JSON.stringify(event);
		let totalSent = 0;

		this.connections.forEach((connections) => {
			const deadConnections: WebSocket[] = [];

			connections.forEach((ws) => {
				if (ws.readyState === WebSocket.OPEN) {
					try {
						ws.send(message);
						totalSent++;
					} catch (error) {
						logger.error('Error sending WebSocket message:', error);
						deadConnections.push(ws);
					}
				} else {
					deadConnections.push(ws);
				}
			});

			// Clean up dead connections
			deadConnections.forEach((ws) => {
				const connection = this.connectionDetails.get(ws);
				if (connection) {
					this.removeConnection(connection.notebookId, ws);
				}
			});
		});

		logger.debug(`Broadcasted event to ${totalSent} clients across all notebooks`);
	}

	/**
	 * Get connection statistics
	 */
	public getStats(): {
		totalConnections: number;
		notebooksWithConnections: number;
		connectionsByNotebook: Record<string, number>;
	} {
		const connectionsByNotebook: Record<string, number> = {};

		this.connections.forEach((connections, notebookId) => {
			connectionsByNotebook[notebookId] = connections.size;
		});

		return {
			totalConnections: this.getConnectionCount(),
			notebooksWithConnections: this.connections.size,
			connectionsByNotebook
		};
	}

	private getConnectionCount(): number {
		let count = 0;
		this.connections.forEach((connections) => {
			count += connections.size;
		});
		return count;
	}

	/**
	 * Gracefully shutdown the WebSocket server
	 */
	public shutdown(): void {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}

		this.connections.forEach((connections) => {
			connections.forEach((ws) => {
				if (ws.readyState === WebSocket.OPEN) {
					ws.close(1001, 'Server shutdown');
				}
			});
		});

		this.wss.close();
		logger.info('WebSocket server shutdown complete');
	}
}
