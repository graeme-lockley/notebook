import { WebSocketServer, WebSocket } from 'ws';
import type {
	WebSocketService,
	WebSocketConnection
} from '$lib/server/application/ports/outbound/websocket-service';
import { logger } from '$lib/common/infrastructure/logging/logger.service';
import { v4 as uuidv4 } from 'uuid';

export class SvelteKitWebSocketServer {
	private wss: WebSocketServer | null = null;
	private webSocketService: WebSocketService;

	constructor(webSocketService: WebSocketService) {
		this.webSocketService = webSocketService;
	}

	start(port: number = 3001): void {
		if (this.wss) {
			logger.warn('WebSocket server is already running');
			return;
		}

		logger.info(`Creating WebSocket server on port ${port}...`);
		this.wss = new WebSocketServer({ port });
		logger.info(`WebSocket server started successfully on port ${port}`);

		this.wss.on('connection', (ws: WebSocket, request) => {
			logger.info('New WebSocket connection received');
			this.handleConnection(ws, request);
		});

		this.wss.on('error', (error) => {
			logger.error('WebSocket server error:', error);
		});
	}

	stop(): void {
		if (this.wss) {
			this.wss.close();
			this.wss = null;
			logger.info('WebSocket server stopped');
		}
	}

	private async handleConnection(ws: WebSocket, request: unknown): Promise<void> {
		// Extract notebook ID from URL
		const requestObj = request as { url: string; headers: { host: string } };
		const url = new URL(requestObj.url, `http://${requestObj.headers.host}`);
		const notebookId = this.extractNotebookIdFromUrl(url);

		if (!notebookId) {
			logger.error('No notebook ID found in WebSocket connection URL');
			ws.close(1008, 'No notebook ID provided');
			return;
		}

		const connectionId = uuidv4();
		const connection: WebSocketConnection = {
			id: connectionId,
			notebookId,
			send: (data: string) => {
				if (ws.readyState === WebSocket.OPEN) {
					ws.send(data);
				}
			},
			close: () => {
				ws.close();
			},
			isAlive: true
		};

		// Add connection to service (acquires projection)
		try {
			await this.webSocketService.addConnection(connection);
		} catch (error) {
			logger.error(`Failed to add WebSocket connection for notebook ${notebookId}:`, error);
			ws.close(1011, 'Failed to initialize notebook projection');
			return;
		}

		// Set up event handlers
		ws.on('message', (data: Buffer) => {
			this.handleMessage(connection, data);
		});

		ws.on('pong', () => {
			connection.isAlive = true;
		});

		ws.on('close', async () => {
			logger.info(`WebSocket connection closed: ${connectionId}`);
			await this.webSocketService.removeConnection(connectionId);
		});

		ws.on('error', (error) => {
			logger.error(`WebSocket connection error for ${connectionId}:`, error);
			connection.isAlive = false;
		});

		// Send initial connection confirmation
		ws.send(
			JSON.stringify({
				type: 'connected',
				connectionId,
				notebookId,
				timestamp: new Date().toISOString()
			})
		);

		logger.info(`WebSocket connection established: ${connectionId} for notebook ${notebookId}`);
	}

	private handleMessage(connection: WebSocketConnection, data: Buffer): void {
		try {
			const message = JSON.parse(data.toString());

			switch (message.type) {
				case 'ping':
					connection.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
					break;
				case 'pong':
					connection.isAlive = true;
					break;
				default:
					logger.info(`Received message from ${connection.id}:`, message);
			}
		} catch (error) {
			logger.error(`Error parsing message from ${connection.id}:`, error);
		}
	}

	private extractNotebookIdFromUrl(url: URL): string | null {
		// First try to extract from path like /api/notebooks/{notebookId}/websocket
		const pathMatch = url.pathname.match(/\/api\/notebooks\/([^/]+)\/websocket/);
		if (pathMatch) {
			return pathMatch[1];
		}

		// If not in path, try query parameter
		return url.searchParams.get('notebookId');
	}

	// Set up periodic ping to keep connections alive
	startHeartbeat(interval: number = 30000): void {
		setInterval(() => {
			if (this.wss) {
				this.wss.clients.forEach((ws) => {
					if (ws.readyState === WebSocket.OPEN) {
						ws.ping();
					}
				});
			}
		}, interval);
	}
}
