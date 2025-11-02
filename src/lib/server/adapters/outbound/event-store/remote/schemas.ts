import type { EventSchema } from '$lib/server/domain/events/event.types';

export const LIBRARY_EVENT_SCHEMAS: EventSchema[] = [
	{
		eventType: 'notebook.viewed',
		type: 'object',
		$schema: 'https://json-schema.org/draft/2020-12/schema',
		properties: {
			notebookId: { type: 'string' },
			userId: { type: 'string' },
			viewedAt: { type: 'string', format: 'date-time' }
		},
		required: ['notebookId', 'userId', 'viewedAt']
	},
	{
		eventType: 'notebook.created',
		type: 'object',
		$schema: 'https://json-schema.org/draft/2020-12/schema',
		properties: {
			notebookId: { type: 'string' },
			title: { type: 'string' },
			description: { type: 'string' },
			visibility: { type: 'string', enum: ['private', 'public', 'protected'] },
			ownerId: { type: ['string', 'null'] },
			createdAt: { type: 'string', format: 'date-time' }
		},
		required: ['notebookId', 'title', 'visibility', 'createdAt']
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
					description: { type: 'string' },
					visibility: { type: 'string', enum: ['private', 'public'] }
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
			position: { type: 'number' },
			movedAt: { type: 'string', format: 'date-time' }
		},
		required: ['cellId', 'position', 'movedAt']
	}
];

export const USER_EVENT_SCHEMAS: EventSchema[] = [
	{
		eventType: 'user.registered',
		type: 'object',
		$schema: 'https://json-schema.org/draft/2020-12/schema',
		properties: {
			userId: { type: 'string' },
			email: { type: 'string' },
			name: { type: 'string' },
			picture: { type: 'string' },
			provider: { type: 'string' },
			providerId: { type: 'string' },
			registeredAt: { type: 'string', format: 'date-time' }
		},
		required: ['userId', 'email', 'name', 'provider', 'providerId', 'registeredAt']
	},
	{
		eventType: 'user.logged_in',
		type: 'object',
		$schema: 'https://json-schema.org/draft/2020-12/schema',
		properties: {
			userId: { type: 'string' },
			loginAt: { type: 'string', format: 'date-time' }
		},
		required: ['userId', 'loginAt']
	}
];

export const SESSION_EVENT_SCHEMAS: EventSchema[] = [
	{
		eventType: 'session.created',
		type: 'object',
		$schema: 'https://json-schema.org/draft/2020-12/schema',
		properties: {
			sessionId: { type: 'string' },
			userId: { type: 'string' },
			createdAt: { type: 'string', format: 'date-time' },
			expiresAt: { type: 'string', format: 'date-time' }
		},
		required: ['sessionId', 'userId', 'createdAt', 'expiresAt']
	},
	{
		eventType: 'session.expired',
		type: 'object',
		$schema: 'https://json-schema.org/draft/2020-12/schema',
		properties: {
			sessionId: { type: 'string' },
			expiredAt: { type: 'string', format: 'date-time' }
		},
		required: ['sessionId', 'expiredAt']
	}
];
