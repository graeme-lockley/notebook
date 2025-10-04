import { logger } from '$lib/server/infrastructure/logging/logger.service';
import { eventStoreClient } from '$lib/server/adapters/outbound/event-store/remote/config';
import { LIBRARY_EVENT_SCHEMAS } from '$lib/server/adapters/outbound/event-store/remote/schemas';
import { createLibraryService } from '$lib/server/domain/domain-services/library.service.impl';
import type { EventStore } from '$lib/server/application/ports/outbound/event-store';
import { StandaloneWebSocketBroadcaster } from '$lib/server/websocket/standalone-broadcaster';

let isInitialized = false;
let eventBroadcaster: StandaloneWebSocketBroadcaster;
let libraryService: ReturnType<typeof createLibraryService>;

const eventStore = eventStoreClient();

export async function handle({ event, resolve }) {
	// Initialize services on first request if not already done
	if (!isInitialized) {
		await initializeServices();
	}

	// Inject services into event.locals for API routes to access
	event.locals.libraryService = libraryService;
	event.locals.eventBroadcaster = eventBroadcaster;

	return resolve(event);
}

async function initializeServices() {
	try {
		logger.info('Initializing services...');

		// Initialize standalone WebSocket broadcaster
		eventBroadcaster = new StandaloneWebSocketBroadcaster();
		logger.info('Standalone WebSocket broadcaster initialized');

		// Create library service with event broadcaster
		libraryService = createLibraryService(eventStore, eventBroadcaster);

		// Setup library topic
		await setupLibraryTopic();
		await libraryService.hydrateLibrary();
		await libraryService.registerLibraryCallback();

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
	const eventStore = eventStoreClient();

	logger.info('Checking if library topic exists...');
	if (await isValidTopic(eventStore, 'library')) {
		logger.info('Library topic already exists');
		return;
	} else {
		logger.info('Creating library topic...');
		await eventStore.createTopic('library', LIBRARY_EVENT_SCHEMAS);
	}
}
