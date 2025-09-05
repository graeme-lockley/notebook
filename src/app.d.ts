// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			libraryService: import('$lib/server/adapters/services/notebook.service.impl').LibraryService;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
