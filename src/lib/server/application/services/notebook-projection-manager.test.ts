import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotebookProjectionManager } from './notebook-projection-manager';
import type { EventStore } from '../ports/outbound/event-store';
import type { EventBus } from '../ports/outbound/event-bus';

// Mock implementations
const createMockEventStore = (): EventStore => ({
	getHealth: vi.fn().mockResolvedValue({ status: 'healthy', consumers: 0, runningDispatchers: [] }),
	getTopics: vi.fn().mockResolvedValue([]),
	getTopic: vi.fn().mockResolvedValue({ name: 'test-topic', schemas: [] }),
	createTopic: vi.fn().mockResolvedValue(undefined),
	publishEvents: vi.fn().mockResolvedValue(['event-id']),
	publishEvent: vi.fn().mockResolvedValue('event-id'),
	getEvents: vi.fn().mockResolvedValue([
		{
			id: 'event-1',
			type: 'cell.created',
			payload: {
				cellId: 'cell-1',
				kind: 'js',
				value: 'console.log("test")',
				position: 0,
				createdAt: new Date().toISOString()
			},
			timestamp: new Date().toISOString()
		}
	]),
	streamEvents: vi.fn().mockReturnValue({
		[Symbol.asyncIterator]: async function* () {
			// Empty stream by default
		}
	}),
	registerConsumer: vi.fn().mockResolvedValue('consumer-id'),
	getConsumers: vi.fn().mockResolvedValue([]),
	unregisterConsumer: vi.fn().mockResolvedValue(undefined),
	testConnection: vi.fn().mockResolvedValue(true),
	waitForServer: vi.fn().mockResolvedValue(undefined),
	publishEventsBatch: vi.fn().mockResolvedValue(['event-id'])
});

const createMockEventBus = (): EventBus => ({
	subscribe: vi.fn(),
	unsubscribe: vi.fn(),
	publish: vi.fn().mockResolvedValue(undefined),
	publishMany: vi.fn().mockResolvedValue(undefined)
});

describe('NotebookProjectionManager', () => {
	let manager: NotebookProjectionManager;
	let mockEventStore: EventStore;
	let mockEventBus: EventBus;

	beforeEach(() => {
		mockEventStore = createMockEventStore();
		mockEventBus = createMockEventBus();
		manager = new NotebookProjectionManager(mockEventStore, mockEventBus, {
			gracePeriodMs: 100, // Short grace period for tests
			enableEventStreaming: false // Disable streaming for most tests
		});
	});

	afterEach(async () => {
		await manager.shutdown();
	});

	describe('acquireProjection', () => {
		it('should create and hydrate a new projection', async () => {
			const notebookId = 'notebook-1';

			await manager.acquireProjection(notebookId);

			// Check that events were fetched
			expect(mockEventStore.getEvents).toHaveBeenCalledWith(notebookId);

			// Check that projector was subscribed to event bus
			expect(mockEventBus.subscribe).toHaveBeenCalledWith('cell.created', expect.anything());
			expect(mockEventBus.subscribe).toHaveBeenCalledWith('cell.updated', expect.anything());
			expect(mockEventBus.subscribe).toHaveBeenCalledWith('cell.deleted', expect.anything());
			expect(mockEventBus.subscribe).toHaveBeenCalledWith('cell.moved', expect.anything());

			// Check stats
			const stats = manager.getStats();
			expect(stats.activeProjections).toBe(1);
			expect(stats.projections[0].notebookId).toBe(notebookId);
			expect(stats.projections[0].referenceCount).toBe(1);
		});

		it('should increment reference count for existing projection', async () => {
			const notebookId = 'notebook-1';

			await manager.acquireProjection(notebookId);
			await manager.acquireProjection(notebookId);

			const stats = manager.getStats();
			expect(stats.activeProjections).toBe(1);
			expect(stats.projections[0].referenceCount).toBe(2);

			// Should only hydrate once
			expect(mockEventStore.getEvents).toHaveBeenCalledTimes(1);
		});

		it('should cancel eviction timer when re-acquiring during grace period', async () => {
			const notebookId = 'notebook-1';

			await manager.acquireProjection(notebookId);
			await manager.releaseProjection(notebookId);

			// Check eviction timer is set
			let stats = manager.getStats();
			expect(stats.projections[0].hasEvictionTimer).toBe(true);

			// Re-acquire before grace period expires
			await manager.acquireProjection(notebookId);

			// Check eviction timer is cancelled
			stats = manager.getStats();
			expect(stats.projections[0].hasEvictionTimer).toBe(false);
			expect(stats.projections[0].referenceCount).toBe(1);
		});

		it('should handle concurrent acquisition requests', async () => {
			const notebookId = 'notebook-1';

			// Simulate concurrent requests
			await Promise.all([
				manager.acquireProjection(notebookId),
				manager.acquireProjection(notebookId),
				manager.acquireProjection(notebookId)
			]);

			const stats = manager.getStats();
			expect(stats.activeProjections).toBe(1);
			expect(stats.projections[0].referenceCount).toBe(3);

			// Should only hydrate once
			expect(mockEventStore.getEvents).toHaveBeenCalledTimes(1);
		});
	});

	describe('releaseProjection', () => {
		it('should decrement reference count', async () => {
			const notebookId = 'notebook-1';

			await manager.acquireProjection(notebookId);
			await manager.acquireProjection(notebookId);

			let stats = manager.getStats();
			expect(stats.projections[0].referenceCount).toBe(2);

			await manager.releaseProjection(notebookId);

			stats = manager.getStats();
			expect(stats.projections[0].referenceCount).toBe(1);
		});

		it('should start grace period timer when reference count reaches 0', async () => {
			const notebookId = 'notebook-1';

			await manager.acquireProjection(notebookId);
			await manager.releaseProjection(notebookId);

			const stats = manager.getStats();
			expect(stats.projections[0].hasEvictionTimer).toBe(true);
			expect(stats.projections[0].referenceCount).toBe(0);
		});

		it('should evict projection after grace period expires', async () => {
			const notebookId = 'notebook-1';

			await manager.acquireProjection(notebookId);
			await manager.releaseProjection(notebookId);

			// Wait for grace period to expire (100ms in test config)
			await new Promise((resolve) => setTimeout(resolve, 150));

			const stats = manager.getStats();
			expect(stats.activeProjections).toBe(0);

			// Check that projector was unsubscribed
			expect(mockEventBus.unsubscribe).toHaveBeenCalledWith('cell.created', expect.anything());
			expect(mockEventBus.unsubscribe).toHaveBeenCalledWith('cell.updated', expect.anything());
			expect(mockEventBus.unsubscribe).toHaveBeenCalledWith('cell.deleted', expect.anything());
			expect(mockEventBus.unsubscribe).toHaveBeenCalledWith('cell.moved', expect.anything());
		});

		it('should handle release of non-existent projection', async () => {
			await expect(manager.releaseProjection('non-existent')).resolves.not.toThrow();
		});

		it('should not evict if reference count is still positive', async () => {
			const notebookId = 'notebook-1';

			await manager.acquireProjection(notebookId);
			await manager.acquireProjection(notebookId);
			await manager.releaseProjection(notebookId);

			// Wait longer than grace period
			await new Promise((resolve) => setTimeout(resolve, 150));

			const stats = manager.getStats();
			expect(stats.activeProjections).toBe(1);
			expect(stats.projections[0].referenceCount).toBe(1);
		});
	});

	describe('getProjectionReadModel', () => {
		it('should return read model for existing projection', async () => {
			const notebookId = 'notebook-1';

			await manager.acquireProjection(notebookId);
			const readModel = await manager.getProjectionReadModel(notebookId);

			expect(readModel).toBeDefined();
		});

		it('should return null for non-existent projection', async () => {
			const readModel = await manager.getProjectionReadModel('non-existent');
			expect(readModel).toBeNull();
		});

		it('should update last accessed time', async () => {
			const notebookId = 'notebook-1';

			await manager.acquireProjection(notebookId);

			const stats1 = manager.getStats();
			const firstAccessTime = stats1.projections[0].lastAccessedAt;

			// Wait a bit
			await new Promise((resolve) => setTimeout(resolve, 10));

			await manager.getProjectionReadModel(notebookId);

			const stats2 = manager.getStats();
			const secondAccessTime = stats2.projections[0].lastAccessedAt;

			expect(secondAccessTime.getTime()).toBeGreaterThan(firstAccessTime.getTime());
		});
	});

	describe('shutdown', () => {
		it('should evict all projections', async () => {
			await manager.acquireProjection('notebook-1');
			await manager.acquireProjection('notebook-2');
			await manager.acquireProjection('notebook-3');

			let stats = manager.getStats();
			expect(stats.activeProjections).toBe(3);

			await manager.shutdown();

			stats = manager.getStats();
			expect(stats.activeProjections).toBe(0);
		});

		it('should unsubscribe all projectors from event bus', async () => {
			await manager.acquireProjection('notebook-1');
			await manager.acquireProjection('notebook-2');

			vi.clearAllMocks();

			await manager.shutdown();

			// Should unsubscribe each projector (4 event types each)
			expect(mockEventBus.unsubscribe).toHaveBeenCalledTimes(8);
		});
	});

	describe('event streaming', () => {
		it('should start event streaming when enabled', async () => {
			const streamingManager = new NotebookProjectionManager(mockEventStore, mockEventBus, {
				gracePeriodMs: 100,
				enableEventStreaming: true
			});

			await streamingManager.acquireProjection('notebook-1');

			// Should call streamEvents
			expect(mockEventStore.streamEvents).toHaveBeenCalled();

			await streamingManager.shutdown();
		});

		it('should not start event streaming when disabled', async () => {
			await manager.acquireProjection('notebook-1');

			// Should not call streamEvents
			expect(mockEventStore.streamEvents).not.toHaveBeenCalled();
		});
	});

	describe('hydration', () => {
		it('should handle hydration errors gracefully', async () => {
			mockEventStore.getEvents = vi.fn().mockRejectedValue(new Error('Event store error'));

			await expect(manager.acquireProjection('notebook-1')).rejects.toThrow('Event store error');

			const stats = manager.getStats();
			expect(stats.activeProjections).toBe(0);
		});
	});

	describe('getStats', () => {
		it('should return correct statistics', async () => {
			await manager.acquireProjection('notebook-1');
			await manager.acquireProjection('notebook-2');
			await manager.acquireProjection('notebook-1'); // Increment ref count

			const stats = manager.getStats();

			expect(stats.activeProjections).toBe(2);
			expect(stats.projections).toHaveLength(2);

			const notebook1Stats = stats.projections.find((p) => p.notebookId === 'notebook-1');
			expect(notebook1Stats?.referenceCount).toBe(2);

			const notebook2Stats = stats.projections.find((p) => p.notebookId === 'notebook-2');
			expect(notebook2Stats?.referenceCount).toBe(1);
		});

		it('should reflect eviction timer status', async () => {
			await manager.acquireProjection('notebook-1');
			await manager.releaseProjection('notebook-1');

			const stats = manager.getStats();
			expect(stats.projections[0].hasEvictionTimer).toBe(true);
		});
	});
});
