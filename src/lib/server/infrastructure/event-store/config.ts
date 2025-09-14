import type { EventStoreConfig } from './types';
import { EventStoreClient } from './client';
import type { EventStorePort } from '../../ports/event-store/event-store.port';

export function eventStoreConfig(): EventStoreConfig {
	return {
		baseUrl: process.env.EVENT_STORE_URL || 'http://localhost:8000',
		timeout: parseInt(process.env.EVENT_STORE_TIMEOUT || '10000'),
		retries: parseInt(process.env.EVENT_STORE_RETRIES || '3'),
		retryDelay: parseInt(process.env.EVENT_STORE_RETRY_DELAY || '1000')
	};
}

export function eventStoreClient(config: EventStoreConfig = eventStoreConfig()): EventStorePort {
	return new EventStoreClient(config);
}

export { type EventStoreClient, type EventStorePort };
