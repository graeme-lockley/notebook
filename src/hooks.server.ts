import { logger } from '$lib/server/infrastructure/logging/logger.service';
import { eventStoreClient } from '$lib/server/infrastructure/event-store/config';
import { LIBRARY_EVENT_SCHEMAS } from '$lib/server/infrastructure/event-store/schemas';
import { createLibraryService } from '$lib/server/adapters/services/notebook.service.impl';
import type { EventStore } from '$lib/server/application/ports/outbound/event-store';

let isInitialized = false;

const libraryService = createLibraryService(eventStoreClient());

export async function handle({ event, resolve }) {
	// Initialize services on first request if not already done
	if (!isInitialized) {
		await initializeServices();
	}

	// Inject services into event.locals for API routes to access
	event.locals.libraryService = libraryService;

	return resolve(event);
}

async function initializeServices() {
	try {
		logger.info('Initializing Event Store services...');

		await setupLibraryTopic();
		await libraryService.hydrateLibrary();
		await libraryService.registerLibraryCallback();

		isInitialized = true;

		logger.info('Event Store services initialized successfully');
	} catch (error) {
		logger.error('Failed to initialize Event Store services:', error);
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
