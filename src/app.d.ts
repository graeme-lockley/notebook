// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			libraryService: import('$lib/server/application/services/library-application-service').LibraryApplicationService;
			notebookCommandService: import('$lib/server/application/services/notebook-command.service').NotebookCommandService;
			eventStore: import('$lib/server/application/ports/outbound/event-store').EventStore;
			eventBus: import('$lib/server/application/ports/outbound/event-bus').EventBus;
			libraryReadModel: import('$lib/server/application/ports/inbound/read-models').LibraryReadModel;
			projectionManager: import('$lib/server/application/services/notebook-projection-manager').NotebookProjectionManager;
			webSocketService: import('$lib/server/application/ports/outbound/websocket-service').WebSocketService;

			// Authentication services (optional - may be null if OAuth not configured)
			authenticationService:
				| import('$lib/server/application/services/authentication.service').AuthenticationService
				| null;
			sessionService: import('$lib/server/application/services/session.service').SessionService;
			oauthRouteHandler:
				| import('$lib/server/application/adapters/inbound/oauth-route-handler').OAuthRouteHandler
				| null;
			userReadModel: import('$lib/server/application/ports/inbound/user-read-model').UserReadModel;
			sessionReadModel: import('$lib/server/application/ports/inbound/session-read-model').SessionReadModel;

			// Authentication context (injected by middleware)
			user: import('$lib/server/domain/value-objects').User | null;
			isAuthenticated: boolean;
			sessionId: string | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
