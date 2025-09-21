// Event Store Port Interface
// This port defines the contract for event store implementations
// following the hexagonal architecture pattern

import type {
	Consumer,
	Event,
	EventRequest,
	EventsQuery,
	HealthStatus,
	Schema,
	Topic
} from './types';

/**
 * EventStore port interface that defines the contract for event store implementations.
 * This allows for dependency inversion and easier testing by providing a clean abstraction
 * over the actual event store implementation.
 */
export interface EventStore {
	// Health check
	getHealth(): Promise<HealthStatus>;

	// Topic management
	createTopic(name: string, schemas: Schema[]): Promise<void>;
	getTopics(): Promise<Topic[]>;
	getTopic(name: string): Promise<Topic>;

	// Event management
	publishEvents(events: EventRequest[]): Promise<string[]>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	publishEvent(topic: string, type: string, payload: any): Promise<string>;
	getEvents(topic: string, query?: EventsQuery): Promise<Event[]>;

	// Consumer management
	registerConsumer(callback: string, topics: Record<string, string | null>): Promise<string>;
	getConsumers(): Promise<Consumer[]>;
	unregisterConsumer(id: string): Promise<void>;

	// Utility methods
	testConnection(): Promise<boolean>;
	waitForServer(options?: {
		maxWaitTime?: number;
		pollInterval?: number;
		throwOnTimeout?: boolean;
	}): Promise<void>;

	// Batch operations
	publishEventsBatch(events: EventRequest[], batchSize?: number): Promise<string[]>;

	// Event streaming
	streamEvents(
		topic: string,
		options?: {
			sinceEventId?: string;
			pollInterval?: number;
			signal?: AbortSignal;
		}
	): AsyncGenerator<Event>;
}
