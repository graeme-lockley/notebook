import type { EventStore } from '../ports/outbound/event-store';
import type { EventBus } from '../ports/outbound/event-bus';
import type { PerNotebookReadModelInterface } from '../ports/inbound/read-models';
import { NotebookProjector } from '../projectors/notebook-projector';
import { PerNotebookReadModel } from '../adapters/inbound/per-notebook-read-model';
import {
	DEFAULT_PROJECTION_CONFIG,
	type ProjectionManagerConfig
} from './projection-manager-config';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

/**
 * State tracking for a single notebook projection
 */
interface ProjectionState {
	notebookId: string;
	projector: NotebookProjector;
	readModel: PerNotebookReadModel;
	referenceCount: number;
	createdAt: Date;
	lastAccessedAt: Date;
	evictionTimer: NodeJS.Timeout | null;
	lastProcessedEventId: string | null;
	eventStreamAbortController: AbortController | null;
	isHydrating: boolean;
}

/**
 * Manages the lifecycle of notebook projections with lazy loading and reference counting.
 *
 * Features:
 * - On-demand hydration from event store
 * - Reference counting for shared access
 * - Grace period eviction when unused
 * - Event streaming to keep projections current
 * - Thread-safe operations
 */
export class NotebookProjectionManager {
	private projections = new Map<string, ProjectionState>();
	private hydrationLocks = new Map<string, Promise<void>>();
	private config: ProjectionManagerConfig;

	constructor(
		private eventStore: EventStore,
		private eventBus: EventBus,
		config?: Partial<ProjectionManagerConfig>
	) {
		this.config = { ...DEFAULT_PROJECTION_CONFIG, ...config };
		logger.info('NotebookProjectionManager: Initialized', this.config);
	}

	/**
	 * Acquire a projection for a notebook. Creates and hydrates if necessary.
	 * Increments reference count and cancels any pending eviction.
	 */
	async acquireProjection(notebookId: string): Promise<void> {
		logger.info(`NotebookProjectionManager: Acquiring projection for notebook ${notebookId}`);

		const existingState = this.projections.get(notebookId);

		if (existingState) {
			// Cancel eviction timer if running
			if (existingState.evictionTimer) {
				clearTimeout(existingState.evictionTimer);
				existingState.evictionTimer = null;
				logger.info(
					`NotebookProjectionManager: Cancelled eviction timer for notebook ${notebookId}`
				);
			}

			// Increment reference count
			existingState.referenceCount++;
			existingState.lastAccessedAt = new Date();
			logger.info(
				`NotebookProjectionManager: Incremented refCount to ${existingState.referenceCount} for notebook ${notebookId}`
			);
			return;
		}

		// Check if hydration is already in progress
		const existingHydration = this.hydrationLocks.get(notebookId);
		if (existingHydration) {
			logger.info(
				`NotebookProjectionManager: Waiting for in-progress hydration for notebook ${notebookId}`
			);
			await existingHydration;

			// After waiting, check if projection still exists and increment reference count
			const state = this.projections.get(notebookId);
			if (state) {
				// Cancel any eviction timer that might have started
				if (state.evictionTimer) {
					clearTimeout(state.evictionTimer);
					state.evictionTimer = null;
					logger.info(
						`NotebookProjectionManager: Cancelled eviction timer for notebook ${notebookId} after hydration wait`
					);
				}

				state.referenceCount++;
				state.lastAccessedAt = new Date();
				logger.info(
					`NotebookProjectionManager: Incremented refCount to ${state.referenceCount} after hydration for notebook ${notebookId}`
				);
				return;
			} else {
				// Projection was evicted while waiting, need to hydrate again
				logger.warn(
					`NotebookProjectionManager: Projection was evicted while waiting for hydration for notebook ${notebookId}, re-hydrating`
				);
				// Fall through to start new hydration
			}
		}

		// Start new hydration
		const hydrationPromise = this.hydrateProjection(notebookId);
		this.hydrationLocks.set(notebookId, hydrationPromise);

		try {
			await hydrationPromise;
		} finally {
			this.hydrationLocks.delete(notebookId);
		}
	}

	/**
	 * Release a projection. Decrements reference count and starts grace period if count reaches 0.
	 */
	async releaseProjection(notebookId: string): Promise<void> {
		logger.info(`NotebookProjectionManager: Releasing projection for notebook ${notebookId}`);

		const state = this.projections.get(notebookId);
		if (!state) {
			logger.warn(
				`NotebookProjectionManager: Attempted to release non-existent projection for notebook ${notebookId}`
			);
			return;
		}

		// Decrement reference count
		state.referenceCount--;
		state.lastAccessedAt = new Date();
		logger.info(
			`NotebookProjectionManager: Decremented refCount to ${state.referenceCount} for notebook ${notebookId}`
		);

		// Start grace period if no more references
		if (state.referenceCount <= 0) {
			logger.info(
				`NotebookProjectionManager: Starting grace period (${this.config.gracePeriodMs}ms) for notebook ${notebookId}`
			);

			state.evictionTimer = setTimeout(() => {
				this.evictProjection(notebookId);
			}, this.config.gracePeriodMs);
		}
	}

	/**
	 * Get the read model for a notebook projection, if it exists.
	 */
	async getProjectionReadModel(notebookId: string): Promise<PerNotebookReadModelInterface | null> {
		const state = this.projections.get(notebookId);
		if (!state) {
			logger.debug(`NotebookProjectionManager: No projection found for notebook ${notebookId}`);
			return null;
		}

		// Update last accessed time (extends grace period on next release)
		state.lastAccessedAt = new Date();
		return state.readModel;
	}

	/**
	 * Shutdown the projection manager, evicting all projections.
	 */
	async shutdown(): Promise<void> {
		logger.info('NotebookProjectionManager: Shutting down...');

		const notebookIds = Array.from(this.projections.keys());
		for (const notebookId of notebookIds) {
			await this.evictProjection(notebookId);
		}

		logger.info('NotebookProjectionManager: Shutdown complete');
	}

	/**
	 * Get statistics about active projections.
	 */
	getStats(): {
		activeProjections: number;
		projections: Array<{
			notebookId: string;
			referenceCount: number;
			createdAt: Date;
			lastAccessedAt: Date;
			hasEvictionTimer: boolean;
		}>;
	} {
		return {
			activeProjections: this.projections.size,
			projections: Array.from(this.projections.values()).map((state) => ({
				notebookId: state.notebookId,
				referenceCount: state.referenceCount,
				createdAt: state.createdAt,
				lastAccessedAt: state.lastAccessedAt,
				hasEvictionTimer: state.evictionTimer !== null
			}))
		};
	}

	/**
	 * Hydrate a projection from the event store and start event streaming.
	 */
	private async hydrateProjection(notebookId: string): Promise<void> {
		logger.info(`NotebookProjectionManager: Hydrating projection for notebook ${notebookId}`);

		// Create read model and projector
		const readModel = new PerNotebookReadModel(notebookId);
		const projector = new NotebookProjector(readModel, notebookId);

		// Create state
		const state: ProjectionState = {
			notebookId,
			projector,
			readModel,
			referenceCount: 1, // Initial reference
			createdAt: new Date(),
			lastAccessedAt: new Date(),
			evictionTimer: null,
			lastProcessedEventId: null,
			eventStreamAbortController: null,
			isHydrating: true
		};

		this.projections.set(notebookId, state);

		try {
			// Get all events for this notebook from event store
			logger.info(`NotebookProjectionManager: Calling eventStore.getEvents for ${notebookId}`);
			const events = await this.eventStore.getEvents(notebookId);
			logger.info(
				`NotebookProjectionManager: Received ${events.length} events from event store for ${notebookId}`
			);

			if (events.length === 0) {
				logger.warn(
					`NotebookProjectionManager: No events found for notebook ${notebookId}. ` +
						`This could mean: (1) the notebook has no cells yet, (2) the Event Store is not running, ` +
						`or (3) the notebook topic doesn't exist. Check that Event Store is running on port 8000.`
				);
			} else {
				logger.info(
					`NotebookProjectionManager: Hydrating ${events.length} events for notebook ${notebookId}`
				);
			}

			// Process each event through the projector
			for (const event of events) {
				const domainEvent = {
					id: event.id,
					type: event.type,
					payload: event.payload,
					timestamp: new Date(event.timestamp),
					aggregateId: notebookId
				};
				await projector.handle(domainEvent);
			}

			// Track last processed event
			state.lastProcessedEventId = projector.getLastProcessedEventId();
			state.isHydrating = false;

			logger.info(
				`NotebookProjectionManager: Hydration complete for notebook ${notebookId}, lastEventId: ${state.lastProcessedEventId}`
			);

			// Only subscribe to event bus if event streaming is disabled
			// Otherwise, we'll get duplicate events (once from event bus, once from stream)
			if (!this.config.enableEventStreaming) {
				this.subscribeProjectorToEventBus(state);
			}

			// Start event streaming if enabled
			if (this.config.enableEventStreaming) {
				this.startEventStream(state);
			}
		} catch (error) {
			logger.error(
				`NotebookProjectionManager: Error hydrating projection for notebook ${notebookId}:`,
				error
			);
			// Clean up on error
			this.projections.delete(notebookId);
			throw error;
		}
	}

	/**
	 * Subscribe the projector to the event bus for cell events.
	 */
	private subscribeProjectorToEventBus(state: ProjectionState): void {
		// Subscribe to all cell event types for this notebook
		// The projector will filter events for its notebook
		this.eventBus.subscribe('cell.created', state.projector);
		this.eventBus.subscribe('cell.updated', state.projector);
		this.eventBus.subscribe('cell.deleted', state.projector);
		this.eventBus.subscribe('cell.moved', state.projector);

		logger.info(
			`NotebookProjectionManager: Subscribed projector to event bus for notebook ${state.notebookId}`
		);
	}

	/**
	 * Unsubscribe the projector from the event bus.
	 */
	private unsubscribeProjectorFromEventBus(state: ProjectionState): void {
		this.eventBus.unsubscribe('cell.created', state.projector);
		this.eventBus.unsubscribe('cell.updated', state.projector);
		this.eventBus.unsubscribe('cell.deleted', state.projector);
		this.eventBus.unsubscribe('cell.moved', state.projector);

		logger.info(
			`NotebookProjectionManager: Unsubscribed projector from event bus for notebook ${state.notebookId}`
		);
	}

	/**
	 * Start event streaming to keep the projection current.
	 */
	private startEventStream(state: ProjectionState): void {
		const abortController = new AbortController();
		state.eventStreamAbortController = abortController;

		logger.info(
			`NotebookProjectionManager: Starting event stream for notebook ${state.notebookId} from eventId: ${state.lastProcessedEventId}`
		);

		// Start streaming in background
		this.streamEvents(state, abortController.signal).catch((error) => {
			if (error.name !== 'AbortError') {
				logger.error(
					`NotebookProjectionManager: Event stream error for notebook ${state.notebookId}:`,
					error
				);
			}
		});
	}

	/**
	 * Stream events from event store and apply to projection.
	 */
	private async streamEvents(state: ProjectionState, signal: AbortSignal): Promise<void> {
		try {
			for await (const event of this.eventStore.streamEvents(state.notebookId, {
				sinceEventId: state.lastProcessedEventId || undefined,
				signal
			})) {
				if (signal.aborted) {
					break;
				}

				const domainEvent = {
					id: event.id,
					type: event.type,
					payload: event.payload,
					timestamp: new Date(event.timestamp),
					aggregateId: state.notebookId
				};

				await state.projector.handle(domainEvent);
				state.lastProcessedEventId = event.id;

				logger.debug(
					`NotebookProjectionManager: Processed streamed event ${event.id} for notebook ${state.notebookId}`
				);
			}
		} catch (error) {
			if ((error as Error).name === 'AbortError') {
				logger.info(
					`NotebookProjectionManager: Event stream aborted for notebook ${state.notebookId}`
				);
			} else {
				throw error;
			}
		}
	}

	/**
	 * Evict a projection, cleaning up all resources.
	 */
	private async evictProjection(notebookId: string): Promise<void> {
		logger.info(`NotebookProjectionManager: Evicting projection for notebook ${notebookId}`);

		const state = this.projections.get(notebookId);
		if (!state) {
			logger.warn(
				`NotebookProjectionManager: Attempted to evict non-existent projection for notebook ${notebookId}`
			);
			return;
		}

		// Clear eviction timer if set
		if (state.evictionTimer) {
			clearTimeout(state.evictionTimer);
			state.evictionTimer = null;
		}

		// Stop event streaming
		if (state.eventStreamAbortController) {
			state.eventStreamAbortController.abort();
			state.eventStreamAbortController = null;
		}

		// Unsubscribe from event bus
		this.unsubscribeProjectorFromEventBus(state);

		// Remove from projections map
		this.projections.delete(notebookId);

		logger.info(
			`NotebookProjectionManager: Evicted projection for notebook ${notebookId} (was active for ${Date.now() - state.createdAt.getTime()}ms)`
		);
	}
}
