import { logger } from '$lib/common/infrastructure/logging/logger.service';
import { eventStoreClient } from '$lib/server/adapters/outbound/event-store/remote/config';
import { LIBRARY_EVENT_SCHEMAS } from '$lib/server/adapters/outbound/event-store/remote/schemas';
import { LibraryApplicationService } from '$lib/server/application/services/library-application-service';
import { NotebookProjectionManager } from '$lib/server/application/services/notebook-projection-manager';
import { NotebookCommandService } from '$lib/server/application/services/notebook-command.service';
import type { EventStore } from '$lib/server/application/ports/outbound/event-store';
import { SimpleEventBus } from '$lib/server/application/adapters/outbound/simple-event-bus';
import { InMemoryLibraryReadModel } from '$lib/server/application/adapters/inbound/in-memory-library-read-model';
import { LibraryProjector } from '$lib/server/application/projectors/library-projector';
import { WebSocketProjector } from '$lib/server/application/projectors/websocket-projector';
import { SvelteKitWebSocketService } from '$lib/server/application/adapters/outbound/sveltekit-websocket-service';
import { SvelteKitWebSocketServer } from '$lib/server/websocket/sveltekit-websocket-server';
import type { EventBus } from '$lib/server/application/ports/outbound/event-bus';
import type { LibraryReadModel } from '$lib/server/application/ports/inbound/read-models';
import type { WebSocketService } from '$lib/server/application/ports/outbound/websocket-service';

let isInitialized = false;
let libraryService: LibraryApplicationService;
let notebookCommandService: NotebookCommandService;
let eventBus: EventBus;
let libraryReadModel: LibraryReadModel;
let projectionManager: NotebookProjectionManager;
let webSocketService: WebSocketService;
let webSocketServer: SvelteKitWebSocketServer;
// Initialize event store
const eventStore: EventStore = eventStoreClient();

export async function handle({ event, resolve }) {
	// Initialize services on first request if not already done
	if (!isInitialized) {
		await initializeServices();
	}

	// Inject services into event.locals for API routes to access
	event.locals.libraryService = libraryService;
	event.locals.notebookCommandService = notebookCommandService;
	event.locals.eventStore = eventStore;
	event.locals.eventBus = eventBus;
	event.locals.libraryReadModel = libraryReadModel;
	event.locals.projectionManager = projectionManager;
	event.locals.webSocketService = webSocketService;

	return resolve(event);
}

async function initializeServices() {
	try {
		logger.configure({ enableInfo: true });
		logger.info('Initializing services...');

		// Initialize event bus and library read model
		eventBus = new SimpleEventBus();
		libraryReadModel = new InMemoryLibraryReadModel();
		logger.info('Event bus and library read model initialized');

		// Initialize projection manager for lazy notebook loading
		projectionManager = new NotebookProjectionManager(eventStore, eventBus, {
			gracePeriodMs: 60000, // 60 seconds
			enableEventStreaming: true
		});
		logger.info('Notebook projection manager initialized');

		// Initialize WebSocket service with projection manager
		webSocketService = new SvelteKitWebSocketService(projectionManager);
		webSocketServer = new SvelteKitWebSocketServer(webSocketService);
		logger.info('Starting WebSocket server on port 3001...');
		webSocketServer.start(3001);
		webSocketServer.startHeartbeat();
		logger.info('WebSocket service and server initialized and running');

		// Create and register library projector (always loaded)
		const libraryProjector = new LibraryProjector(libraryReadModel);
		const webSocketProjector = new WebSocketProjector(webSocketService);

		// Subscribe library projector to notebook events
		eventBus.subscribe('notebook.created', libraryProjector);
		eventBus.subscribe('notebook.updated', libraryProjector);
		eventBus.subscribe('notebook.deleted', libraryProjector);

		// Subscribe WebSocket projector to all events
		eventBus.subscribe('cell.created', webSocketProjector);
		eventBus.subscribe('cell.updated', webSocketProjector);
		eventBus.subscribe('cell.deleted', webSocketProjector);
		eventBus.subscribe('cell.moved', webSocketProjector);
		eventBus.subscribe('notebook.created', webSocketProjector);
		eventBus.subscribe('notebook.updated', webSocketProjector);
		eventBus.subscribe('notebook.deleted', webSocketProjector);
		logger.info('Projectors registered with event bus');

		// Create application services that bridge domain and infrastructure
		libraryService = new LibraryApplicationService(eventStore);
		notebookCommandService = new NotebookCommandService(eventStore, projectionManager, eventBus);

		// Initialize the library service to hydrate with existing events
		await libraryService.initialize();

		// Hydrate library read model only (notebooks loaded lazily)
		await hydrateLibraryReadModel(libraryProjector);

		// Setup library topic
		await setupLibraryTopic();

		isInitialized = true;

		logger.info('All services initialized successfully (notebooks will be loaded lazily)');
	} catch (error) {
		logger.error('Failed to initialize services:', error);
		throw error;
	}
}

async function isValidTopic(eventStore: EventStore, topicName: string): Promise<boolean> {
	try {
		await eventStore.getTopic(topicName);
		return true;
	} catch {
		return false;
	}
}

async function hydrateLibraryReadModel(
	libraryProjector: import('$lib/server/application/projectors/library-projector').LibraryProjector
) {
	logger.info('Hydrating library read model with existing events...');

	try {
		// Check if library topic exists first
		const libraryTopicExists = await isValidTopic(eventStore, 'library');
		logger.info(`Library topic exists: ${libraryTopicExists}`);

		if (libraryTopicExists) {
			// Get all events from the library topic
			const libraryEvents = await eventStore.getEvents('library', { limit: 1000 });
			logger.info(`Found ${libraryEvents.length} library events to hydrate`);

			// Process library events through the library projector
			for (const event of libraryEvents) {
				const domainEvent = {
					id: event.id,
					type: event.type,
					payload: event.payload,
					timestamp: new Date(event.timestamp),
					aggregateId: 'library'
				};
				await libraryProjector.handle(domainEvent);
			}
		} else {
			logger.info('Library topic does not exist, skipping library events hydration');
		}

		logger.info('Library read model hydrated successfully');
		logger.info('Notebook projections will be loaded on-demand when accessed');
	} catch (error) {
		logger.error('Error hydrating library read model:', error);
		// Don't throw - this is not critical for startup
	}
}

async function setupLibraryTopic() {
	logger.info('Checking if library topic exists...');
	if (await isValidTopic(eventStore, 'library')) {
		logger.info('Library topic already exists');
		return;
	} else {
		logger.info('Creating library topic...');
		await eventStore.createTopic('library', LIBRARY_EVENT_SCHEMAS);
	}
}
