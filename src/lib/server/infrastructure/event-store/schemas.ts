import type { EventSchema } from '../../ports/events/event.types';

export const LIBRARY_EVENT_SCHEMAS: EventSchema[] = [
	{
		eventType: 'notebook.created',
		type: 'object',
		$schema: 'https://json-schema.org/draft/2020-12/schema',
		properties: {
			notebookId: { type: 'string' },
			title: { type: 'string' },
			description: { type: 'string' },
			createdAt: { type: 'string', format: 'date-time' }
		},
		required: ['notebookId', 'title', 'createdAt']
	},
	{
		eventType: 'notebook.updated',
		type: 'object',
		$schema: 'https://json-schema.org/draft/2020-12/schema',
		properties: {
			notebookId: { type: 'string' },
			changes: {
				type: 'object',
				properties: {
					title: { type: 'string' },
					description: { type: 'string' }
				}
			},
			updatedAt: { type: 'string', format: 'date-time' }
		},
		required: ['notebookId', 'changes', 'updatedAt']
	},
	{
		eventType: 'notebook.deleted',
		type: 'object',
		$schema: 'https://json-schema.org/draft/2020-12/schema',
		properties: {
			notebookId: { type: 'string' },
			deletedAt: { type: 'string', format: 'date-time' }
		},
		required: ['notebookId', 'deletedAt']
	}
];

export const NOTEBOOK_EVENT_SCHEMAS: EventSchema[] = [
	{
		eventType: 'cell.created',
		type: 'object',
		$schema: 'https://json-schema.org/draft/2020-12/schema',
		properties: {
			cellId: { type: 'string' },
			kind: { type: 'string', enum: ['js', 'md', 'html'] },
			value: { type: 'string' },
			position: { type: 'number' },
			createdAt: { type: 'string', format: 'date-time' }
		},
		required: ['cellId', 'kind', 'value', 'position', 'createdAt']
	},
	{
		eventType: 'cell.updated',
		type: 'object',
		$schema: 'https://json-schema.org/draft/2020-12/schema',
		properties: {
			cellId: { type: 'string' },
			changes: {
				type: 'object',
				properties: {
					value: { type: 'string' },
					kind: { type: 'string', enum: ['js', 'md', 'html'] },
					isClosed: { type: 'boolean' }
				}
			},
			updatedAt: { type: 'string', format: 'date-time' }
		},
		required: ['cellId', 'changes', 'updatedAt']
	},
	{
		eventType: 'cell.deleted',
		type: 'object',
		$schema: 'https://json-schema.org/draft/2020-12/schema',
		properties: {
			cellId: { type: 'string' },
			deletedAt: { type: 'string', format: 'date-time' }
		},
		required: ['cellId', 'deletedAt']
	},
	{
		eventType: 'cell.moved',
		type: 'object',
		$schema: 'https://json-schema.org/draft/2020-12/schema',
		properties: {
			cellId: { type: 'string' },
			oldPosition: { type: 'number' },
			newPosition: { type: 'number' },
			movedAt: { type: 'string', format: 'date-time' }
		},
		required: ['cellId', 'oldPosition', 'newPosition', 'movedAt']
	}
];
