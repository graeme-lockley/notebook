import { createNotebookStore, type NotebookStore } from '$lib/client/stores/notebook';
import { ReactiveNotebook } from '$lib/client/model/cell';
import * as ServerQuery from '$lib/client/server/server-queries';
import type { GetNotebookResponse } from '$lib/types/api-contracts';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

/**
 * Result of loading a notebook
 */
export interface LoadNotebookResult {
	notebook: ReactiveNotebook;
	store: NotebookStore;
}

/**
 * NotebookLoaderService - Handles loading and initializing notebooks
 *
 * Responsibilities:
 * - Fetching notebook data from the server
 * - Creating ReactiveNotebook instances from server data
 * - Creating and initializing notebook stores
 */
export class NotebookLoaderService {
	/**
	 * Loads a notebook from the server and creates a store for it
	 * @param notebookId - ID of the notebook to load
	 * @returns Promise with notebook and store
	 * @throws Error if loading fails
	 */
	async loadNotebook(notebookId: string): Promise<LoadNotebookResult> {
		logger.info('🚀 Loading notebook:', notebookId);

		try {
			const notebookData = await this.fetchNotebookData(notebookId);
			const notebook = await this.createNotebookFromData(notebookData);
			const store = createNotebookStore(notebook);

			logger.info(
				'✅ Notebook loaded successfully:',
				notebookId,
				'with',
				notebook.cells.length,
				'cells'
			);

			return { notebook, store };
		} catch (error) {
			logger.error('❌ Error loading notebook:', notebookId, error);
			throw error;
		}
	}

	/**
	 * Reloads a notebook from the server (useful for refresh operations)
	 * @param notebookId - ID of the notebook to reload
	 * @returns Promise with fresh notebook and store
	 */
	async reloadNotebook(notebookId: string): Promise<LoadNotebookResult> {
		logger.info('🔄 Reloading notebook:', notebookId);
		return this.loadNotebook(notebookId);
	}

	/**
	 * Fetches notebook data from the server API
	 * @param notebookId - ID of the notebook to fetch
	 * @returns Promise with notebook data
	 * @private
	 */
	private async fetchNotebookData(notebookId: string): Promise<GetNotebookResponse> {
		return await ServerQuery.getNotebook(notebookId);
	}

	/**
	 * Creates a ReactiveNotebook instance from server data
	 * @param data - Notebook data from server
	 * @returns Promise with initialized ReactiveNotebook
	 * @private
	 */
	private async createNotebookFromData(data: GetNotebookResponse): Promise<ReactiveNotebook> {
		const notebook = new ReactiveNotebook({
			title: data.title,
			description: data.description || ''
		});

		// Add all cells from the API response to the notebook
		for (const cellData of data.cells) {
			await notebook.addCell({
				id: cellData.id,
				kind: cellData.kind,
				value: cellData.value,
				focus: false // Don't focus on loaded cells
			});
		}

		return notebook;
	}
}
