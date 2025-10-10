import type { NotebookProjectionManager } from '../services/notebook-projection-manager';
import type { CellReadModel } from '../ports/inbound/read-models';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

/**
 * Middleware helper for REST API endpoints that need to access notebook projections.
 * Automatically acquires and releases projections around the operation.
 *
 * @param notebookId - The notebook ID to acquire projection for
 * @param projectionManager - The projection manager instance
 * @param operation - The operation to perform with the read model
 * @returns The result of the operation
 *
 * @example
 * ```typescript
 * export async function GET({ params, locals }: RequestEvent) {
 *   return withProjection(
 *     params.notebookId,
 *     locals.projectionManager,
 *     async (readModel) => {
 *       const cells = await readModel.getCells(params.notebookId);
 *       return json({ cells });
 *     }
 *   );
 * }
 * ```
 */
export async function withProjection<T>(
	notebookId: string,
	projectionManager: NotebookProjectionManager,
	operation: (readModel: CellReadModel) => Promise<T>
): Promise<T> {
	logger.debug(`withProjection: Acquiring projection for notebook ${notebookId}`);

	// Acquire the projection
	await projectionManager.acquireProjection(notebookId);

	try {
		// Get the read model
		const readModel = await projectionManager.getProjectionReadModel(notebookId);

		if (!readModel) {
			throw new Error(`Failed to get read model for notebook ${notebookId}`);
		}

		// Perform the operation
		const result = await operation(readModel);

		logger.debug(`withProjection: Operation completed for notebook ${notebookId}`);
		return result;
	} finally {
		// Always release the projection, even if operation fails
		await projectionManager.releaseProjection(notebookId);
		logger.debug(`withProjection: Released projection for notebook ${notebookId}`);
	}
}
