export interface EventSchema {
	eventType: string;
	type: 'object';
	$schema: string;
	properties: Record<string, unknown>;
	required: string[];
}
