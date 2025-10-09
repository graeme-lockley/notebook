import { logger } from '$lib/common/infrastructure/logging/logger.service';

/**
 * WebSocket connection state
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Callback for connection state changes
 */
export type ConnectionStateCallback = (state: ConnectionState) => void;

/**
 * Callback for incoming WebSocket messages
 */
export type MessageCallback = (data: unknown) => void;

/**
 * WebSocketConnectionService - Manages WebSocket lifecycle
 *
 * Responsibilities:
 * - Creating and managing WebSocket connections
 * - Handling reconnection with exponential backoff
 * - Managing message handlers
 * - Connection state tracking
 */
export class WebSocketConnectionService {
	private websocket: WebSocket | null = null;
	private reconnectAttempts = 0;
	private reconnectDelay = 1000; // Start with 1 second
	private maxReconnectAttempts = 5;
	private messageHandlers: Set<MessageCallback> = new Set();
	private stateHandlers: Set<ConnectionStateCallback> = new Set();
	private currentState: ConnectionState = 'disconnected';
	private currentNotebookId: string | null = null;
	private reconnectTimeoutId: number | null = null;

	/**
	 * Connects to the WebSocket server for a specific notebook
	 * @param notebookId - ID of the notebook to connect to
	 */
	connect(notebookId: string): void {
		if (this.websocket?.readyState === WebSocket.OPEN) {
			logger.info('WebSocket already connected, closing existing connection');
			this.disconnect();
		}

		this.currentNotebookId = notebookId;
		this.setupConnection(notebookId);
	}

	/**
	 * Disconnects from the WebSocket server
	 */
	disconnect(): void {
		if (this.reconnectTimeoutId !== null) {
			clearTimeout(this.reconnectTimeoutId);
			this.reconnectTimeoutId = null;
		}

		if (this.websocket) {
			this.websocket.close();
			this.websocket = null;
		}

		this.currentNotebookId = null;
		this.reconnectAttempts = 0;
		this.updateState('disconnected');
	}

	/**
	 * Sends a message through the WebSocket
	 * @param message - Message object to send
	 */
	send(message: object): void {
		if (this.websocket?.readyState === WebSocket.OPEN) {
			this.websocket.send(JSON.stringify(message));
		} else {
			logger.error('Cannot send message: WebSocket is not connected');
		}
	}

	/**
	 * Registers a callback for incoming messages
	 * @param handler - Callback to handle messages
	 * @returns Unsubscribe function
	 */
	onMessage(handler: MessageCallback): () => void {
		this.messageHandlers.add(handler);
		return () => {
			this.messageHandlers.delete(handler);
		};
	}

	/**
	 * Registers a callback for connection state changes
	 * @param handler - Callback to handle state changes
	 * @returns Unsubscribe function
	 */
	onStateChange(handler: ConnectionStateCallback): () => void {
		this.stateHandlers.add(handler);
		// Immediately call with current state
		handler(this.currentState);
		return () => {
			this.stateHandlers.delete(handler);
		};
	}

	/**
	 * Returns the current connection state
	 */
	getState(): ConnectionState {
		return this.currentState;
	}

	/**
	 * Checks if the WebSocket is currently connected
	 */
	isConnected(): boolean {
		return this.websocket?.readyState === WebSocket.OPEN && this.currentState === 'connected';
	}

	/**
	 * Sets up the WebSocket connection
	 * @private
	 */
	private setupConnection(notebookId: string): void {
		this.updateState('connecting');

		// Use WebSocket URL with notebook ID as query parameter
		const wsUrl = `ws://localhost:3001?notebookId=${notebookId}`;
		this.websocket = new WebSocket(wsUrl);

		this.websocket.onopen = () => {
			logger.info('WebSocket connected');
			this.reconnectAttempts = 0;
			this.reconnectDelay = 1000;
			this.updateState('connected');

			// Send initial ping and ready signal
			this.send({ type: 'ping' });
			this.send({ type: 'client_ready', data: { notebookId } });
		};

		this.websocket.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				logger.info('🔌 WebSocket message received:', data);
				this.notifyMessageHandlers(data);
			} catch (err) {
				logger.error('Error parsing WebSocket message:', err);
			}
		};

		this.websocket.onclose = (event) => {
			logger.info('WebSocket disconnected:', event.code, event.reason);
			this.updateState('disconnected');
			this.attemptReconnect(notebookId);
		};

		this.websocket.onerror = (error) => {
			logger.error('WebSocket error:', error);
			this.updateState('error');
		};
	}

	/**
	 * Attempts to reconnect with exponential backoff
	 * @private
	 */
	private attemptReconnect(notebookId: string): void {
		if (this.reconnectAttempts < this.maxReconnectAttempts) {
			this.reconnectAttempts++;
			logger.info(
				`Attempting to reconnect WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
			);

			this.reconnectTimeoutId = window.setTimeout(() => {
				this.setupConnection(notebookId);
			}, this.reconnectDelay);

			// Exponential backoff
			this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
		} else {
			logger.error('Max reconnection attempts reached');
			this.updateState('error');
		}
	}

	/**
	 * Updates the connection state and notifies handlers
	 * @private
	 */
	private updateState(state: ConnectionState): void {
		if (this.currentState !== state) {
			this.currentState = state;
			this.stateHandlers.forEach((handler) => handler(state));
		}
	}

	/**
	 * Notifies all message handlers of a new message
	 * @private
	 */
	private notifyMessageHandlers(data: unknown): void {
		this.messageHandlers.forEach((handler) => {
			try {
				handler(data);
			} catch (err) {
				logger.error('Error in message handler:', err);
			}
		});
	}
}
