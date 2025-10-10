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
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
