import type { PageServerLoad } from './$types';
import { logger } from '$lib/common/infrastructure/logging/logger.service';
import { NotebookEventFactory } from '$lib/server/application/services/notebook-event-factory';
import { getAuthContext } from '$lib/server/utils/auth-helpers';

export const load: PageServerLoad = async ({ params, locals }) => {
	logger.debug(`Notebook page server load: Loading notebook ${params.notebookId}`);

	// Get authentication context from middleware
	const auth = getAuthContext(locals);
	const { user, isAuthenticated, sessionId } = auth;

	logger.debug(`Notebook page: User ${user?.id || 'null'}, authenticated: ${isAuthenticated}`);

	// Check access control before loading the page
	const notebook = locals.libraryService.getNotebook(params.notebookId);
	if (!notebook) {
		logger.error(`Notebook not found: ${params.notebookId}`);
		return {
			notebookId: params.notebookId,
			error: 'Notebook not found',
			user: locals.userSerializationService.serializeForClient(user),
			isAuthenticated,
			sessionId
		};
	}

	const userId = user?.id || null;
	const canView = locals.notebookAccessControlService.canView(notebook, userId, isAuthenticated);

	if (!canView) {
		logger.warn(
			`Access denied: User ${userId || 'anonymous'} cannot view notebook ${params.notebookId}`
		);
		return {
			notebookId: params.notebookId,
			error: 'Access denied',
			user: locals.userSerializationService.serializeForClient(user),
			isAuthenticated,
			sessionId
		};
	}

	// Emit notebook.viewed event if user is authenticated
	if (isAuthenticated && user) {
		try {
			logger.info(
				`Notebook page: Emitting notebook.viewed event for ${params.notebookId} by user ${user.id}`
			);
			const viewedEvent = NotebookEventFactory.createNotebookViewedEvent(
				params.notebookId,
				user.id
			);

			logger.info(`Notebook page: Created event: ${JSON.stringify(viewedEvent)}`);

			// Publish to event store and event bus
			// Try to publish to event store, but continue with event bus even if it fails
			let eventId: string | undefined;
			try {
				eventId = await locals.eventStore.publishEvent(
					'library', // Use 'library' topic for notebook metadata events
					viewedEvent.type,
					viewedEvent.payload
				);
				logger.info(`Notebook page: Published to event store with ID: ${eventId}`);
			} catch (storeError: unknown) {
				// Check if it's a schema validation error (400)
				const errorStatus =
					storeError && typeof storeError === 'object' && 'status' in storeError
						? (storeError as { status: number }).status
						: null;

				if (errorStatus === 400) {
					logger.error(
						`Notebook page: Event Store rejected event - 'notebook.viewed' schema may not be registered in 'library' topic`
					);
					logger.error(`Notebook page: Error details:`, storeError);
					logger.warn(
						`Notebook page: Continuing with event bus only - recent notebooks may not persist across restarts`
					);
					// Generate a temporary event ID for event bus
					eventId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
				} else {
					// Re-throw non-400 errors
					throw storeError;
				}
			}

			// Always publish to event bus for immediate projector processing (in-memory read model)
			const domainEvent = {
				...viewedEvent,
				id: eventId || `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				aggregateId: params.notebookId,
				timestamp: new Date()
			};
			await locals.eventBus.publish(domainEvent);
			logger.info(`Notebook page: Published to event bus: ${domainEvent.id}`);
			logger.info(
				`Notebook page: Successfully emitted notebook.viewed event for ${params.notebookId} by user ${user.id}`
			);
		} catch (error) {
			// Don't fail the page load if event emission fails
			logger.error(`Notebook page: Failed to emit notebook.viewed event:`, error);
		}
	} else {
		logger.debug(
			`Notebook page: Not emitting notebook.viewed event - user not authenticated (user: ${user ? 'exists' : 'null'}, authenticated: ${isAuthenticated})`
		);
	}

	// Serialize user if present (convert Date objects to ISO strings for client)
	const serializedUser = locals.userSerializationService.serializeForClient(user);

	logger.debug(`Notebook page: User picture: ${user?.picture || 'none'}`);

	return {
		notebookId: params.notebookId,
		user: serializedUser,
		isAuthenticated,
		sessionId
	};
};
