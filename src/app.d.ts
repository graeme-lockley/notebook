// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			libraryService: import('$lib/server/application/ports/inbound/notebook-service').LibraryService;
			eventBroadcaster: import('$lib/server/websocket/standalone-broadcaster').StandaloneWebSocketBroadcaster;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
