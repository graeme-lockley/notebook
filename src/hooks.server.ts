import { logger } from '$lib/server/infrastructure/logging/logger.service';
import { eventStoreClient } from '$lib/server/adapters/outbound/event-store/remote/config';
import { LIBRARY_EVENT_SCHEMAS } from '$lib/server/adapters/outbound/event-store/remote/schemas';
import { LibraryApplicationService } from '$lib/server/application/services/library-application-service';
import { NotebookApplicationService } from '$lib/server/application/services/notebook-application-service';
import type { EventStore } from '$lib/server/application/ports/outbound/event-store';
import { StandaloneWebSocketBroadcaster } from '$lib/server/websocket/standalone-broadcaster';

let isInitialized = false;
let eventBroadcaster: StandaloneWebSocketBroadcaster;
let libraryService: LibraryApplicationService;
let notebookService: NotebookApplicationService;
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
	event.locals.eventBroadcaster = eventBroadcaster;
	event.locals.eventStore = eventStore;

	return resolve(event);
}

async function initializeServices() {
	try {
		logger.info('Initializing services...');

		// Initialize standalone WebSocket broadcaster
		eventBroadcaster = new StandaloneWebSocketBroadcaster();
		logger.info('Standalone WebSocket broadcaster initialized');

		// Create application services that bridge domain and infrastructure
		libraryService = new LibraryApplicationService(eventStore, eventBroadcaster);
		notebookService = new NotebookApplicationService(eventStore, eventBroadcaster);

		// Initialize the library service to hydrate with existing events
		await libraryService.initialize();

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
