export interface BaseEvent {
	id: string;
	timestamp: string;
	type: string;
	payload: unknown;
}

export interface EventStoreConfig {
	baseUrl: string;
	timeout: number;
	retries: number;
	retryDelay: number;
}

export interface EventSchema {
	eventType: string;
	type: 'object';
	$schema: string;
	properties: Record<string, unknown>;
	required: string[];
}

export interface EventRetrievalOptions {
	sinceEventId?: string;
	limit?: number;
	date?: string;
}

export interface ConsumerRegistration {
	callback: string;
	topics: Record<string, string | null>;
}

export interface Consumer {
	id: string;
	callback: string;
	topics: Record<string, string | null>;
}

export interface Topic {
	name: string;
	sequence: number;
	schemas: EventSchema[];
}

export interface HealthStatus {
	status: 'healthy' | 'unhealthy';
	consumers: number;
	runningDispatchers: string[];
}
