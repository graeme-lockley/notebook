// Event Broadcaster for WebSocket Integration
// Bridges Event Store events to WebSocket clients

import type { EventStore } from '$lib/server/application/ports/outbound/event-store';
import type { NotebookWebSocketServer } from './websocket-server';
import { logger } from '$lib/server/infrastructure/logging/logger.service';

export interface EventBroadcastMessage {
	type: string;
	data: {
		notebookId: string;
		cells?: unknown[];
		event?: {
			id: string;
			type: string;
			payload: unknown;
		};
		timestamp?: number;
		[key: string]: unknown;
	};
}

export class EventBroadcaster {
	private wsServer: NotebookWebSocketServer;
	private eventStore: EventStore;
	private activeStreams = new Map<string, AbortController>(); // notebookId -> AbortController

	constructor(wsServer: NotebookWebSocketServer, eventStore: EventStore) {
		this.wsServer = wsServer;
		this.eventStore = eventStore;
	}

	/**
	 * Start broadcasting events for a specific notebook
	 */
	public async startBroadcasting(notebookId: string, sinceEventId?: string): Promise<void> {
		// Stop existing stream if any
		this.stopBroadcasting(notebookId);

		const abortController = new AbortController();
		this.activeStreams.set(notebookId, abortController);

		try {
			// Check if topic exists
			await this.eventStore.getTopic(notebookId);
		} catch (error: unknown) {
			if (
				error &&
				typeof error === 'object' &&
				'status' in error &&
				(error as { status: number }).status === 404
			) {
				logger.info(`Topic ${notebookId} does not exist yet`);
				return;
			}
			throw error;
		}

		// Start streaming events
		this.streamEventsForNotebook(notebookId, sinceEventId, abortController.signal);
	}

	/**
	 * Stop broadcasting events for a specific notebook
	 */
	public stopBroadcasting(notebookId: string): void {
		const abortController = this.activeStreams.get(notebookId);
		if (abortController) {
			abortController.abort();
			this.activeStreams.delete(notebookId);
			logger.debug(`Stopped broadcasting events for notebook ${notebookId}`);
		}
	}

	/**
	 * Stop all broadcasting
	 */
	public stopAllBroadcasting(): void {
		this.activeStreams.forEach((abortController, notebookId) => {
			abortController.abort();
			logger.debug(`Stopped broadcasting events for notebook ${notebookId}`);
		});
		this.activeStreams.clear();
	}

	private async streamEventsForNotebook(
		notebookId: string,
		sinceEventId: string | undefined,
		signal: AbortSignal
	): Promise<void> {
		try {
			logger.info(`Starting event stream for notebook ${notebookId}`);

			for await (const event of this.eventStore.streamEvents(notebookId, {
				sinceEventId,
				pollInterval: 1000, // Reduced poll interval for better real-time performance
				signal
			})) {
				if (signal.aborted) {
					break;
				}

				try {
					// Create broadcast message
					const broadcastMessage: EventBroadcastMessage = {
						type: 'notebook.updated',
						data: {
							notebookId,
							cells: [], // Will be populated by the notebook service
							event: {
								id: event.id,
								type: event.type,
								payload: event.payload
							},
							timestamp: Date.now()
						}
					};

					// Broadcast to WebSocket clients
					this.wsServer.broadcastToNotebook(notebookId, broadcastMessage);
					logger.debug(`Broadcasted event ${event.id} for notebook ${notebookId}`);
				} catch (error) {
					logger.error(`Error processing event ${event.id} for notebook ${notebookId}:`, error);
					// Don't break the stream on individual event processing errors
				}
			}
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				logger.info(`Event stream aborted for notebook ${notebookId}`);
			} else {
				logger.error(`Error in event stream for notebook ${notebookId}:`, error);
			}
		} finally {
			this.activeStreams.delete(notebookId);
		}
	}

	/**
	 * Broadcast a custom event to a specific notebook
	 */
	public broadcastCustomEvent(notebookId: string, eventType: string, data: unknown): void {
		const message: EventBroadcastMessage = {
			type: eventType,
			data: {
				notebookId,
				...(typeof data === 'object' && data !== null ? data : {}),
				timestamp: Date.now()
			}
		};

		this.wsServer.broadcastToNotebook(notebookId, message);
		logger.debug(`Broadcasted custom event ${eventType} for notebook ${notebookId}`);
	}

	/**
	 * Broadcast initialization message to a specific notebook
	 */
	public broadcastInitialization(notebookId: string, cells: unknown[]): void {
		const message: EventBroadcastMessage = {
			type: 'notebook.initialized',
			data: {
				notebookId,
				cells,
				timestamp: Date.now()
			}
		};

		this.wsServer.broadcastToNotebook(notebookId, message);
		logger.debug(`Broadcasted initialization for notebook ${notebookId}`);
	}

	/**
	 * Get active streaming statistics
	 */
	public getStats(): { activeStreams: string[]; totalActiveStreams: number } {
		return {
			activeStreams: Array.from(this.activeStreams.keys()),
			totalActiveStreams: this.activeStreams.size
		};
	}
}
