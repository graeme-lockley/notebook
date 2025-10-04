import { json } from '@sveltejs/kit';
import { logger } from '$lib/server/infrastructure/logging/logger.service';
import type { RequestEvent } from '@sveltejs/kit';
import type { LibraryApplicationService } from '$lib/server/application/services/library-application-service';
import type { EventStore } from '$lib/server/application/ports/outbound/event-store';

export async function GET({ params, locals }: RequestEvent): Promise<Response> {
	try {
		const { notebookId } = params;

		if (!notebookId) {
			return json({ error: 'Notebook ID is required' }, { status: 400 });
		}

		// Access the injected services
		const libraryService: LibraryApplicationService = locals.libraryService;
		const eventStore: EventStore = locals.eventStore;

		// Check if notebook exists
		const notebook = libraryService.getNotebook(notebookId);
		if (!notebook) {
			return json({ error: 'Notebook not found' }, { status: 404 });
		}

		// Create a readable stream for Server-Sent Events
		const stream = new ReadableStream({
			async start(controller) {
				// Send initial data - get current cells from event store
				const getInitialCells = async () => {
					try {
						await eventStore.getEvents(notebookId);
						// For now, return empty array - in Phase 3 we'll implement proper projections
						return [];
					} catch {
						return [];
					}
				};

				// Send initial data
				const initialCells = await getInitialCells();
				const initialData = {
					type: 'notebook.initialized',
					data: {
						notebookId,
						cells: initialCells
					}
				};

				controller.enqueue(`data: ${JSON.stringify(initialData)}\n\n`);

				// Send a heartbeat every 30 seconds to keep connection alive
				const heartbeat = setInterval(() => {
					try {
						controller.enqueue(
							`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`
						);
					} catch {
						clearInterval(heartbeat);
					}
				}, 30000);

				// Set up event streaming with better error handling
				const topicName = notebookId;
				let isStreaming = true;

				// Start streaming in the background with error handling
				(async () => {
					try {
						// Check if topic exists
						try {
							await eventStore.getTopic(topicName);
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
						} catch (error: any) {
							if (error.status === 404) {
								logger.info(`Topic ${topicName} does not exist yet`);
								return; // Exit gracefully if topic doesn't exist
							}
							throw error;
						}

						// Stream events with timeout protection
						const streamTimeout = setTimeout(() => {
							logger.info(`Event stream timeout for notebook ${notebookId}`);
							isStreaming = false;
						}, 60000); // 1 minute timeout

						for await (const event of eventStore.streamEvents(topicName, {
							sinceEventId: undefined, // TODO: Implement proper event tracking in Phase 3
							pollInterval: 2000, // Increased poll interval for stability
							signal: AbortSignal.timeout(60000) // 1 minute timeout
						})) {
							if (!isStreaming) break;

							try {
								// TODO: In Phase 3, we'll implement proper event processing
								// For now, just forward the event to the client

								// Send updated data to client
								const eventData = {
									type: 'notebook.updated',
									data: {
										notebookId,
										cells: [], // TODO: Implement proper cell projection in Phase 3
										event: {
											id: event.id,
											type: event.type,
											payload: event.payload
										}
									}
								};

								// Check if controller is still open before enqueuing
								if (isStreaming) {
									controller.enqueue(`data: ${JSON.stringify(eventData)}\n\n`);
									logger.info(`Sent event ${event.id} to client`);
								} else {
									logger.warn(`Controller closed, skipping event ${event.id}`);
								}
							} catch (error) {
								logger.error(`Error processing event ${event.id}:`, error);
								// Don't break the stream on individual event processing errors
							}
						}

						clearTimeout(streamTimeout);
					} catch (error) {
						if (error instanceof Error && error.name === 'AbortError') {
							logger.info(`Event stream aborted for notebook ${notebookId}`);
						} else {
							logger.error(`Error in event stream for notebook ${notebookId}:`, error);
						}
						isStreaming = false;
					}
				})();

				// Store cleanup function
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(controller as any).cleanup = () => {
					clearInterval(heartbeat);
					isStreaming = false;
				};
			},

			cancel() {
				logger.info(`Event stream cancelled for notebook ${notebookId}`);
				// Cleanup is handled by the controller cleanup function
			}
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			}
		});
	} catch (error) {
		logger.error('Error creating event stream:', error);
		return json({ error: 'Failed to create event stream' }, { status: 500 });
	}
}
