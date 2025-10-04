export interface WebSocketConnection {
	id: string;
	notebookId: string;
	send: (data: string) => void;
	close: () => void;
	isAlive: boolean;
}

export interface WebSocketService {
	/**
	 * Add a new WebSocket connection for a specific notebook
	 */
	addConnection(connection: WebSocketConnection): void;

	/**
	 * Remove a WebSocket connection
	 */
	removeConnection(connectionId: string): void;

	/**
	 * Broadcast a message to all connections for a specific notebook
	 */
	broadcastToNotebook(notebookId: string, event: unknown): void;

	/**
	 * Broadcast a message to all connections
	 */
	broadcastToAll(event: unknown): void;

	/**
	 * Get all connections for a specific notebook
	 */
	getConnectionsForNotebook(notebookId: string): WebSocketConnection[];

	/**
	 * Get all active connections
	 */
	getAllConnections(): WebSocketConnection[];

	/**
	 * Check if a connection is alive and mark it as such
	 */
	pingConnection(connectionId: string): boolean;

	/**
	 * Clean up dead connections
	 */
	cleanupDeadConnections(): void;
}
