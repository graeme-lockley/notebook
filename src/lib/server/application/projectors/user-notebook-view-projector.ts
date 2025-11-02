import type { EventHandler, DomainEvent } from '../ports/outbound/event-bus';
import type { NotebookViewedEvent } from '$lib/server/domain/events/notebook.events';
import type { UserNotebookViewReadModel } from '../ports/inbound/user-notebook-view-read-model';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

/**
 * Projector for notebook.viewed events.
 * Updates the user notebook view read model when notebooks are viewed.
 */
export class UserNotebookViewProjector implements EventHandler {
	constructor(private readModel: UserNotebookViewReadModel) {}

	async handle(event: DomainEvent): Promise<void> {
		logger.info(`UserNotebookViewProjector: handle() called with event type: ${event.type}`);
		logger.info(
			`UserNotebookViewProjector: Full event structure: ${JSON.stringify(event, null, 2)}`
		);

		if (event.type !== 'notebook.viewed') {
			logger.debug(`UserNotebookViewProjector: Ignoring event type: ${event.type}`);
			return;
		}

		logger.info(`UserNotebookViewProjector: ✓ Event type matches 'notebook.viewed'`);
		logger.info(`UserNotebookViewProjector: Event payload type: ${typeof event.payload}`);
		logger.info(
			`UserNotebookViewProjector: Event payload: ${JSON.stringify(event.payload, null, 2)}`
		);

		try {
			const payload = event.payload as NotebookViewedEvent['payload'];
			const { notebookId, userId, viewedAt } = payload;

			logger.info(
				`UserNotebookViewProjector: Extracted - notebookId: ${notebookId}, userId: ${userId}, viewedAt: ${viewedAt}`
			);

			if (!notebookId) {
				logger.error(`UserNotebookViewProjector: Missing notebookId in payload`);
				return;
			}
			if (!userId) {
				logger.error(`UserNotebookViewProjector: Missing userId in payload`);
				return;
			}
			if (!viewedAt) {
				logger.error(`UserNotebookViewProjector: Missing viewedAt in payload`);
				return;
			}

			logger.info(`UserNotebookViewProjector: Calling readModel.recordView()...`);
			this.readModel.recordView(notebookId, userId, new Date(viewedAt));

			logger.info(
				`UserNotebookViewProjector: ✅ Successfully recorded view of ${notebookId} by user ${userId} at ${viewedAt}`
			);
		} catch (error) {
			logger.error(`UserNotebookViewProjector: ❌ Error processing event:`, error);
			throw error;
		}
	}
}
