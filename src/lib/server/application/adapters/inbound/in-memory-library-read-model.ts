import type { LibraryReadModel } from '../../ports/inbound/read-models';
import type { Notebook } from '$lib/server/domain/value-objects';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

export class InMemoryLibraryReadModel implements LibraryReadModel {
	private notebooks: Map<string, Notebook> = new Map();

	async getNotebooks(): Promise<Notebook[]> {
		const notebooks = Array.from(this.notebooks.values());
		logger.debug(`LibraryReadModel: getNotebooks(): ${notebooks.length} notebooks`);
		return [...notebooks]; // Return a copy to prevent external mutation
	}

	async getNotebook(notebookId: string): Promise<Notebook | null> {
		const notebook = this.notebooks.get(notebookId);
		logger.debug(
			`LibraryReadModel: getNotebook(${notebookId}): ${notebook ? 'found' : 'not found'}`
		);
		return notebook || null;
	}

	async getNotebookCount(): Promise<number> {
		const count = this.notebooks.size;
		logger.debug(`LibraryReadModel: getNotebookCount(): ${count}`);
		return count;
	}

	// Internal methods for projectors to update the read model
	updateNotebook(notebook: Notebook): void {
		this.notebooks.set(notebook.id, notebook);
		logger.debug(`LibraryReadModel: updateNotebook(${notebook.id})`);
	}

	removeNotebook(notebookId: string): void {
		this.notebooks.delete(notebookId);
		logger.debug(`LibraryReadModel: removeNotebook(${notebookId})`);
	}
}
