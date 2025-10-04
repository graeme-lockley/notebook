export interface DomainEvent {
	id: string;
	type: string;
	payload: unknown;
	timestamp: Date;
	aggregateId: string;
}

export interface EventHandler {
	handle(event: DomainEvent): Promise<void>;
}

export interface EventBus {
	subscribe(eventType: string, handler: EventHandler): void;
	unsubscribe(eventType: string, handler: EventHandler): void;
	publish(event: DomainEvent): Promise<void>;
	publishMany(events: DomainEvent[]): Promise<void>;
}
