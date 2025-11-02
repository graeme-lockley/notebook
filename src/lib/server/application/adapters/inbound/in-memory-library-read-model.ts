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

	async searchNotebooks(
		query: string,
		visibility?: 'private' | 'public' | 'protected',
		userId?: string | null
	): Promise<Notebook[]> {
		if (!query || query.trim() === '') {
			logger.debug('LibraryReadModel: searchNotebooks: Empty query, returning empty array');
			return [];
		}

		const normalizedQuery = query.trim().toLowerCase();
		const allNotebooks = Array.from(this.notebooks.values());

		// Filter by search query
		let matchingNotebooks = allNotebooks.filter((notebook) =>
			notebook.title.toLowerCase().includes(normalizedQuery)
		);

		// Filter by visibility if specified
		if (visibility) {
			matchingNotebooks = matchingNotebooks.filter(
				(notebook) => notebook.visibility === visibility
			);
		}

		// Apply privacy rules:
		// - Public notebooks: visible to everyone (anonymous or authenticated)
		// - Protected notebooks: visible to everyone (anonymous or authenticated)
		// - Private notebooks: only visible to the owner
		if (userId !== undefined) {
			matchingNotebooks = matchingNotebooks.filter((notebook) => {
				if (notebook.visibility === 'public' || notebook.visibility === 'protected') {
					return true; // Public and protected notebooks are visible to everyone
				}
				// Private notebooks: only show if user is the owner
				return notebook.ownerId === userId;
			});
		} else {
			// If no userId provided (anonymous), only show public and protected notebooks
			matchingNotebooks = matchingNotebooks.filter(
				(notebook) => notebook.visibility === 'public' || notebook.visibility === 'protected'
			);
		}

		logger.debug(
			`LibraryReadModel: searchNotebooks("${query}", visibility: ${visibility}, userId: ${userId}): ${matchingNotebooks.length} results`
		);
		return [...matchingNotebooks]; // Return copy to prevent mutation
	}
}
