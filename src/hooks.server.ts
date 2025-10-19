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

// Authentication services imports
import { OAuthConfigService } from '$lib/server/application/services/oauth-config.service';
import { OAuthProviderRegistry } from '$lib/server/application/services/oauth-provider-registry';
import { GoogleOAuthProvider } from '$lib/server/application/adapters/outbound/oauth-providers/google-oauth-provider';
import { InMemoryUserReadModel } from '$lib/server/application/adapters/inbound/in-memory-user-read-model';
import { InMemorySessionReadModel } from '$lib/server/application/adapters/inbound/in-memory-session-read-model';
import { UserProjector } from '$lib/server/application/projectors/user-projector';
import { SessionProjector } from '$lib/server/application/projectors/session-projector';
import { AuthenticationService } from '$lib/server/application/services/authentication.service';
import { SessionService } from '$lib/server/application/services/session.service';
import { OAuthRouteHandler } from '$lib/server/application/adapters/inbound/oauth-route-handler';
import type { UserReadModel } from '$lib/server/application/ports/inbound/user-read-model';
import type { SessionReadModel } from '$lib/server/application/ports/inbound/session-read-model';

let isInitialized = false;
let libraryService: LibraryApplicationService;
let notebookCommandService: NotebookCommandService;
let eventBus: EventBus;
let libraryReadModel: LibraryReadModel;
let projectionManager: NotebookProjectionManager;
let webSocketService: WebSocketService;
let webSocketServer: SvelteKitWebSocketServer;

// Authentication services
let oauthConfigService: OAuthConfigService;
let oauthProviderRegistry: OAuthProviderRegistry;
let userReadModel: UserReadModel;
let sessionReadModel: SessionReadModel;
let authenticationService: AuthenticationService | null;
let sessionService: SessionService;
let oauthRouteHandler: OAuthRouteHandler | null;
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

	// Inject authentication services
	event.locals.authenticationService = authenticationService;
	event.locals.sessionService = sessionService;
	event.locals.oauthRouteHandler = oauthRouteHandler;
	event.locals.userReadModel = userReadModel;
	event.locals.sessionReadModel = sessionReadModel;

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
			enableEventStreaming: false // Use Event Bus for real-time updates (push-based)
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
		libraryService = new LibraryApplicationService(eventStore, eventBus);
		notebookCommandService = new NotebookCommandService(eventStore, projectionManager, eventBus);

		// Initialize the library service to hydrate with existing events
		await libraryService.initialize();

		// Hydrate library read model only (notebooks loaded lazily)
		await hydrateLibraryReadModel(libraryProjector);

		// Setup library topic
		await setupLibraryTopic();

		// Initialize authentication services (if OAuth is configured)
		await initializeAuthServices();

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

async function initializeAuthServices() {
	logger.info('Initializing authentication services...');

	try {
		// 1. Initialize OAuth config service
		oauthConfigService = new OAuthConfigService();
		logger.info('OAuth config service initialized');

		// 2. Check if Google OAuth is configured
		if (!oauthConfigService.isProviderConfigured('google')) {
			logger.warn('Google OAuth is not configured. Authentication features will be disabled.');
			logger.warn(
				'To enable authentication, create a .env file with GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI'
			);

			// Initialize minimal services for non-authenticated mode
			userReadModel = new InMemoryUserReadModel();
			sessionReadModel = new InMemorySessionReadModel(userReadModel);
			authenticationService = null;
			sessionService = new SessionService(eventStore, eventBus, sessionReadModel);
			oauthRouteHandler = null;

			logger.info('Authentication services initialized in limited mode (no OAuth)');
			return;
		}

		// 3. Initialize OAuth providers
		const googleConfig = oauthConfigService.getConfig('google');
		const googleProvider = new GoogleOAuthProvider(googleConfig);
		oauthProviderRegistry = new OAuthProviderRegistry([googleProvider]);
		logger.info('OAuth providers initialized');

		// 4. Initialize read models
		userReadModel = new InMemoryUserReadModel();
		sessionReadModel = new InMemorySessionReadModel(userReadModel);
		logger.info('Authentication read models initialized');

		// 5. Initialize projectors
		const userProjector = new UserProjector(userReadModel as InMemoryUserReadModel);
		const sessionProjector = new SessionProjector(sessionReadModel as InMemorySessionReadModel);

		// 6. Subscribe projectors to event bus
		eventBus.subscribe('user.registered', userProjector);
		eventBus.subscribe('user.logged_in', userProjector);
		eventBus.subscribe('session.created', sessionProjector);
		eventBus.subscribe('session.expired', sessionProjector);
		logger.info('Authentication projectors subscribed to event bus');

		// 7. Hydrate read models from event store
		await hydrateUserReadModel(userProjector);
		await hydrateSessionReadModel(sessionProjector);
		logger.info('Authentication read models hydrated');

		// 8. Initialize services
		authenticationService = new AuthenticationService(
			oauthProviderRegistry,
			eventStore,
			eventBus,
			userReadModel
		);
		sessionService = new SessionService(eventStore, eventBus, sessionReadModel);
		oauthRouteHandler = new OAuthRouteHandler(authenticationService, sessionService);

		logger.info('Authentication services initialized successfully');
	} catch (error) {
		logger.error('Failed to initialize authentication services:', error);
		throw error;
	}
}

async function hydrateUserReadModel(userProjector: UserProjector) {
	logger.info('Hydrating user read model with existing events...');

	try {
		// Check if users topic exists
		const usersTopicExists = await isValidTopic(eventStore, 'users');
		logger.info(`Users topic exists: ${usersTopicExists}`);

		if (usersTopicExists) {
			// Get all events from the users topic
			const userEvents = await eventStore.getEvents('users', { limit: 1000 });
			logger.info(`Found ${userEvents.length} user events to hydrate`);

			// Process user events through the user projector
			for (const event of userEvents) {
				const domainEvent = {
					id: event.id,
					type: event.type,
					payload: event.payload,
					timestamp: new Date(event.timestamp),
					aggregateId: 'users'
				};
				await userProjector.handle(domainEvent);
			}
		} else {
			logger.info('Users topic does not exist, skipping user events hydration');
		}

		logger.info('User read model hydrated successfully');
	} catch (error) {
		logger.error('Error hydrating user read model:', error);
		// Don't throw - this is not critical for startup
	}
}

async function hydrateSessionReadModel(sessionProjector: SessionProjector) {
	logger.info('Hydrating session read model with existing events...');

	try {
		// Check if sessions topic exists
		const sessionsTopicExists = await isValidTopic(eventStore, 'sessions');
		logger.info(`Sessions topic exists: ${sessionsTopicExists}`);

		if (sessionsTopicExists) {
			// Get all events from the sessions topic
			const sessionEvents = await eventStore.getEvents('sessions', { limit: 1000 });
			logger.info(`Found ${sessionEvents.length} session events to hydrate`);

			// Process session events through the session projector
			for (const event of sessionEvents) {
				const domainEvent = {
					id: event.id,
					type: event.type,
					payload: event.payload,
					timestamp: new Date(event.timestamp),
					aggregateId: 'sessions'
				};
				await sessionProjector.handle(domainEvent);
			}
		} else {
			logger.info('Sessions topic does not exist, skipping session events hydration');
		}

		logger.info('Session read model hydrated successfully');
	} catch (error) {
		logger.error('Error hydrating session read model:', error);
		// Don't throw - this is not critical for startup
	}
}
