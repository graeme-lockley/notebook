import type { EventStoreConfig } from '../../../../application/ports/outbound/types';
import { EventStoreClient } from './client';
import type { EventStore } from '$lib/server/application/ports/outbound/event-store';

export function eventStoreConfig(): EventStoreConfig {
	return {
		baseUrl: process.env.EVENT_STORE_URL || 'http://localhost:8000',
		timeout: parseInt(process.env.EVENT_STORE_TIMEOUT || '10000'),
		retries: parseInt(process.env.EVENT_STORE_RETRIES || '3'),
		retryDelay: parseInt(process.env.EVENT_STORE_RETRY_DELAY || '1000')
	};
}

export function eventStoreClient(config: EventStoreConfig = eventStoreConfig()): EventStore {
	return new EventStoreClient(config);
}

export { type EventStoreClient, type EventStore as EventStorePort };
