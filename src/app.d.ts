// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			libraryService: import('$lib/server/application/services/library-application-service').LibraryApplicationService;
			notebookService: import('$lib/server/application/services/notebook-application-service').NotebookApplicationService;
			eventStore: import('$lib/server/application/ports/outbound/event-store').EventStore;
			eventBus: import('$lib/server/application/ports/outbound/event-bus').EventBus;
			notebookReadModel: import('$lib/server/application/ports/inbound/read-models').NotebookReadModel;
			libraryReadModel: import('$lib/server/application/ports/inbound/read-models').LibraryReadModel;
			webSocketService: import('$lib/server/application/ports/outbound/websocket-service').WebSocketService;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
