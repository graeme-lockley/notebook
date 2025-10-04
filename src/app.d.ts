// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			libraryService: import('$lib/server/application/services/library-application-service').LibraryApplicationService;
			notebookService: import('$lib/server/application/services/notebook-application-service').NotebookApplicationService;
			eventBroadcaster: import('$lib/server/websocket/standalone-broadcaster').StandaloneWebSocketBroadcaster;
			eventStore: import('$lib/server/application/ports/outbound/event-store').EventStore;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
