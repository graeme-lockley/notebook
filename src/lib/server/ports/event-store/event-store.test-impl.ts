// Test implementation of EventStore port for testing purposes
// This provides an in-memory implementation that can be used in tests
// without requiring a real event store server

import type {
	Consumer,
	ConsumerRegistration,
	Event,
	EventRequest,
	EventsQuery,
	HealthStatus,
	Schema,
	Topic
} from '../../infrastructure/event-store/types';
import type { EventStore } from '../../application/ports/outbound/event-store';

/**
 * In-memory test implementation of EventStore port.
 * This allows for fast, isolated testing without external dependencies.
 */
export class EventStoreTestImpl implements EventStore {
	private topics: Map<string, Topic> = new Map();
	private events: Map<string, Event[]> = new Map();
	private consumers: Map<string, Consumer> = new Map();
	private eventSequence = 0;
	private consumerSequence = 0;

	// Health check
	async getHealth(): Promise<HealthStatus> {
		return {
			status: 'healthy',
			consumers: this.consumers.size,
			runningDispatchers: []
		};
	}

	// Topic management
	async createTopic(name: string, schemas: Schema[]): Promise<void> {
		if (this.topics.has(name)) {
			throw new Error(`Topic '${name}' already exists`);
		}

		const topic: Topic = {
			name,
			sequence: 0,
			schemas
		};

		this.topics.set(name, topic);
		this.events.set(name, []);
	}

	async getTopics(): Promise<Topic[]> {
		return Array.from(this.topics.values());
	}

	async getTopic(name: string): Promise<Topic> {
		const topic = this.topics.get(name);
		if (!topic) {
			throw new Error(`Topic '${name}' not found`);
		}
		return topic;
	}

	// Event management
	async publishEvents(events: EventRequest[]): Promise<string[]> {
		if (!Array.isArray(events) || events.length === 0) {
			throw new Error('Events must be a non-empty array');
		}

		const eventIds: string[] = [];

		for (const eventRequest of events) {
			const { topic: topicName, type, payload } = eventRequest;

			// Ensure topic exists
			const topic = this.topics.get(topicName);
			if (!topic) {
				throw new Error(`Topic '${topicName}' not found`);
			}

			// Create event
			const eventId = `${topicName}-${++this.eventSequence}`;
			const event: Event = {
				id: eventId,
				timestamp: new Date().toISOString(),
				type,
				payload: payload
			};

			// Store event
			const topicEvents = this.events.get(topicName) || [];
			topicEvents.push(event);
			this.events.set(topicName, topicEvents);

			// Update topic sequence
			topic.sequence++;

			eventIds.push(eventId);
		}

		return eventIds;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async publishEvent(topic: string, type: string, payload: any): Promise<string> {
		const eventIds = await this.publishEvents([{ topic, type, payload }]);
		return eventIds[0];
	}

	async getEvents(topic: string, query?: EventsQuery): Promise<Event[]> {
		const topicEvents = this.events.get(topic) || [];
		let filteredEvents = [...topicEvents];

		// Filter by sinceEventId
		if (query?.sinceEventId) {
			const sinceIndex = filteredEvents.findIndex((e) => e.id === query.sinceEventId);
			if (sinceIndex >= 0) {
				filteredEvents = filteredEvents.slice(sinceIndex + 1);
			}
		}

		// Apply limit
		if (query?.limit && query.limit > 0) {
			filteredEvents = filteredEvents.slice(0, query.limit);
		}

		return filteredEvents;
	}

	// Consumer management
	async registerConsumer(registration: ConsumerRegistration): Promise<string> {
		const consumerId = `consumer-${++this.consumerSequence}`;

		const consumer: Consumer = {
			id: consumerId,
			callback: registration.callback,
			topics: { ...registration.topics },
			nudge: async () => {
				// In a real implementation, this would trigger the callback
				// For testing, we just no-op
			}
		};

		this.consumers.set(consumerId, consumer);
		return consumerId;
	}

	async getConsumers(): Promise<Consumer[]> {
		return Array.from(this.consumers.values());
	}

	async unregisterConsumer(id: string): Promise<void> {
		if (!this.consumers.has(id)) {
			throw new Error(`Consumer '${id}' not found`);
		}
		this.consumers.delete(id);
	}

	// Utility methods
	async testConnection(): Promise<boolean> {
		try {
			await this.getHealth();
			return true;
		} catch {
			return false;
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async waitForServer(options?: {
		maxWaitTime?: number;
		pollInterval?: number;
		throwOnTimeout?: boolean;
	}): Promise<void> {
		// In test implementation, server is always ready
		return Promise.resolve();
	}

	// Batch operations
	async publishEventsBatch(events: EventRequest[], batchSize: number = 100): Promise<string[]> {
		const allEventIds: string[] = [];

		for (let i = 0; i < events.length; i += batchSize) {
			const batch = events.slice(i, i + batchSize);
			const eventIds = await this.publishEvents(batch);
			allEventIds.push(...eventIds);
		}

		return allEventIds;
	}

	// Event streaming
	async *streamEvents(
		topic: string,
		options?: {
			sinceEventId?: string;
			pollInterval?: number;
			signal?: AbortSignal;
		}
	): AsyncGenerator<Event> {
		// Simple implementation that yields existing events
		// In a real implementation, this would continuously poll for new events
		const events = await this.getEvents(topic, {
			sinceEventId: options?.sinceEventId,
			limit: 100
		});

		for (const event of events) {
			if (options?.signal?.aborted) {
				break;
			}
			yield event;
		}
	}

	// Test utility methods
	/**
	 * Clear all data - useful for test cleanup
	 */
	clear(): void {
		this.topics.clear();
		this.events.clear();
		this.consumers.clear();
		this.eventSequence = 0;
		this.consumerSequence = 0;
	}

	/**
	 * Get all events for a topic (without query filtering) - useful for test assertions
	 */
	getAllEvents(topic: string): Event[] {
		return this.events.get(topic) || [];
	}

	/**
	 * Check if a topic exists - useful for test assertions
	 */
	hasTopicSync(name: string): boolean {
		return this.topics.has(name);
	}
}
