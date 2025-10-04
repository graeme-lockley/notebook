import { logger } from '$lib/server/infrastructure/logging/logger.service';
import { eventStoreClient } from '$lib/server/adapters/outbound/event-store/remote/config';
import { LIBRARY_EVENT_SCHEMAS } from '$lib/server/adapters/outbound/event-store/remote/schemas';
import { LibraryApplicationService } from '$lib/server/application/services/library-application-service';
import { NotebookApplicationService } from '$lib/server/application/services/notebook-application-service';
import type { EventStore } from '$lib/server/application/ports/outbound/event-store';
import { SimpleEventBus } from '$lib/server/application/adapters/outbound/simple-event-bus';
import { InMemoryNotebookReadModel } from '$lib/server/application/adapters/inbound/in-memory-notebook-read-model';
import { InMemoryLibraryReadModel } from '$lib/server/application/adapters/inbound/in-memory-library-read-model';
import { NotebookProjector } from '$lib/server/application/projectors/notebook-projector';
import { LibraryProjector } from '$lib/server/application/projectors/library-projector';
import { WebSocketProjector } from '$lib/server/application/projectors/websocket-projector';
import { SvelteKitWebSocketService } from '$lib/server/application/adapters/outbound/sveltekit-websocket-service';
import { SvelteKitWebSocketServer } from '$lib/server/websocket/sveltekit-websocket-server';
import type { EventBus } from '$lib/server/application/ports/outbound/event-bus';
import type { NotebookReadModel } from '$lib/server/application/ports/inbound/read-models';
import type { LibraryReadModel } from '$lib/server/application/ports/inbound/read-models';
import type { WebSocketService } from '$lib/server/application/ports/outbound/websocket-service';

let isInitialized = false;
let libraryService: LibraryApplicationService;
let notebookService: NotebookApplicationService;
let eventBus: EventBus;
let notebookReadModel: NotebookReadModel;
let libraryReadModel: LibraryReadModel;
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
	event.locals.notebookService = notebookService;
	event.locals.eventStore = eventStore;
	event.locals.eventBus = eventBus;
	event.locals.notebookReadModel = notebookReadModel;
	event.locals.libraryReadModel = libraryReadModel;
	event.locals.webSocketService = webSocketService;

	return resolve(event);
}

async function initializeServices() {
	try {
		logger.info('Initializing services...');

		// Initialize event bus and read models
		eventBus = new SimpleEventBus();
		notebookReadModel = new InMemoryNotebookReadModel();
		libraryReadModel = new InMemoryLibraryReadModel();
		logger.info('Event bus and read models initialized');

		// Initialize WebSocket service
		webSocketService = new SvelteKitWebSocketService();
		webSocketServer = new SvelteKitWebSocketServer(webSocketService);
		logger.info('Starting WebSocket server on port 3001...');
		webSocketServer.start(3001);
		webSocketServer.startHeartbeat();
		logger.info('WebSocket service and server initialized and running');

		// Create and register projectors
		const notebookProjector = new NotebookProjector(notebookReadModel);
		const libraryProjector = new LibraryProjector(libraryReadModel, notebookReadModel);
		const webSocketProjector = new WebSocketProjector(webSocketService);

		// Subscribe projectors to events
		eventBus.subscribe('cell.created', notebookProjector);
		eventBus.subscribe('cell.updated', notebookProjector);
		eventBus.subscribe('cell.deleted', notebookProjector);
		eventBus.subscribe('cell.moved', notebookProjector);
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
		notebookService = new NotebookApplicationService(eventStore);

		// Initialize the library service to hydrate with existing events
		await libraryService.initialize();

		// Hydrate read models with existing events
		await hydrateReadModels(notebookProjector, libraryProjector);

		// Setup library topic
		await setupLibraryTopic();

		isInitialized = true;

		logger.info('All services initialized successfully');
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

async function hydrateReadModels(
	notebookProjector: import('$lib/server/application/projectors/notebook-projector').NotebookProjector,
	libraryProjector: import('$lib/server/application/projectors/library-projector').LibraryProjector
) {
	logger.info('Hydrating read models with existing events...');

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

		// Get all notebook topics and their events
		const topics = await eventStore.getTopics();
		logger.info(`Found ${topics.length} total topics`);

		const notebookTopics = topics.filter((topic) => topic.name.startsWith('notebook-'));
		logger.info(`Found ${notebookTopics.length} notebook topics to hydrate`);

		// Process events for each notebook
		for (const topic of notebookTopics) {
			const events = await eventStore.getEvents(topic.name, { limit: 1000 });
			logger.info(`Processing ${events.length} events for notebook ${topic.name}`);

			for (const event of events) {
				const domainEvent = {
					id: event.id,
					type: event.type,
					payload: event.payload,
					timestamp: new Date(event.timestamp),
					aggregateId: topic.name
				};
				await notebookProjector.handle(domainEvent);
			}
		}

		logger.info('Read models hydrated successfully');
	} catch (error) {
		logger.error('Error hydrating read models:', error);
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
