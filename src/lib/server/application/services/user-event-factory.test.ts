import { describe, it, expect } from 'vitest';
import { UserEventFactory } from './user-event-factory';
import type { ProviderUserInfo } from '../ports/outbound/oauth-provider';

describe('UserEventFactory', () => {
	describe('createUserRegisteredEvent', () => {
		it('should create user registered event with valid input', () => {
			const providerUserInfo: ProviderUserInfo = {
				id: 'google-123',
				email: 'test@example.com',
				emailVerified: true,
				name: 'Test User',
				picture: 'https://example.com/avatar.jpg'
			};

			const event = UserEventFactory.createUserRegisteredEvent(providerUserInfo, 'google');

			expect(event.type).toBe('user.registered');
			expect(event.payload.email).toBe('test@example.com');
			expect(event.payload.name).toBe('Test User');
			expect(event.payload.picture).toBe('https://example.com/avatar.jpg');
			expect(event.payload.provider).toBe('google');
			expect(event.payload.providerId).toBe('google-123');
			expect(event.payload.userId).toMatch(/^user-/);
			expect(event.payload.registeredAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
		});

		it('should create user registered event without picture', () => {
			const providerUserInfo: ProviderUserInfo = {
				id: 'google-456',
				email: 'test2@example.com',
				emailVerified: true,
				name: 'Test User 2'
			};

			const event = UserEventFactory.createUserRegisteredEvent(providerUserInfo, 'google');

			expect(event.type).toBe('user.registered');
			expect(event.payload.email).toBe('test2@example.com');
			expect(event.payload.name).toBe('Test User 2');
			expect(event.payload.picture).toBeUndefined();
			expect(event.payload.provider).toBe('google');
			expect(event.payload.providerId).toBe('google-456');
		});

		it('should throw error when email is missing', () => {
			const providerUserInfo: ProviderUserInfo = {
				id: 'google-123',
				email: '',
				emailVerified: true,
				name: 'Test User'
			};

			expect(() => {
				UserEventFactory.createUserRegisteredEvent(providerUserInfo, 'google');
			}).toThrow('Email and provider ID are required');
		});

		it('should throw error when provider ID is missing', () => {
			const providerUserInfo: ProviderUserInfo = {
				id: '',
				email: 'test@example.com',
				emailVerified: true,
				name: 'Test User'
			};

			expect(() => {
				UserEventFactory.createUserRegisteredEvent(providerUserInfo, 'google');
			}).toThrow('Email and provider ID are required');
		});

		it('should throw error when email is not verified', () => {
			const providerUserInfo: ProviderUserInfo = {
				id: 'google-123',
				email: 'test@example.com',
				emailVerified: false,
				name: 'Test User'
			};

			expect(() => {
				UserEventFactory.createUserRegisteredEvent(providerUserInfo, 'google');
			}).toThrow('Email must be verified');
		});

		it('should generate unique user IDs for different calls', () => {
			const providerUserInfo: ProviderUserInfo = {
				id: 'google-123',
				email: 'test@example.com',
				emailVerified: true,
				name: 'Test User'
			};

			const event1 = UserEventFactory.createUserRegisteredEvent(providerUserInfo, 'google');
			const event2 = UserEventFactory.createUserRegisteredEvent(providerUserInfo, 'google');

			expect(event1.payload.userId).not.toBe(event2.payload.userId);
			expect(event1.payload.userId).toMatch(/^user-/);
			expect(event2.payload.userId).toMatch(/^user-/);
		});
	});

	describe('createUserLoggedInEvent', () => {
		it('should create user logged in event with valid userId', () => {
			const userId = 'user-123';

			const event = UserEventFactory.createUserLoggedInEvent(userId);

			expect(event.type).toBe('user.logged_in');
			expect(event.payload.userId).toBe(userId);
			expect(event.payload.loginAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
		});

		it('should throw error when userId is empty', () => {
			expect(() => {
				UserEventFactory.createUserLoggedInEvent('');
			}).toThrow('UserId is required');
		});

		it('should throw error when userId is null', () => {
			expect(() => {
				UserEventFactory.createUserLoggedInEvent(null as unknown as string);
			}).toThrow('UserId is required');
		});

		it('should throw error when userId is undefined', () => {
			expect(() => {
				UserEventFactory.createUserLoggedInEvent(undefined as unknown as string);
			}).toThrow('UserId is required');
		});
	});

	describe('createSessionCreatedEvent', () => {
		it('should create session created event with valid userId', () => {
			const userId = 'user-123';

			const event = UserEventFactory.createSessionCreatedEvent(userId);

			expect(event.type).toBe('session.created');
			expect(event.payload.userId).toBe(userId);
			expect(event.payload.sessionId).toMatch(/^session-/);
			expect(event.payload.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
			expect(event.payload.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
		});

		it('should set expiration to 7 days from creation', () => {
			const userId = 'user-123';
			const before = new Date();

			const event = UserEventFactory.createSessionCreatedEvent(userId);

			const after = new Date();
			const createdAt = new Date(event.payload.createdAt);
			const expiresAt = new Date(event.payload.expiresAt);

			// Check that creation time is within expected range
			expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime());

			// Check that expiration is 7 days from creation
			const expectedExpiration = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
			expect(expiresAt.getTime()).toBe(expectedExpiration.getTime());
		});

		it('should generate unique session IDs for different calls', () => {
			const userId = 'user-123';

			const event1 = UserEventFactory.createSessionCreatedEvent(userId);
			const event2 = UserEventFactory.createSessionCreatedEvent(userId);

			expect(event1.payload.sessionId).not.toBe(event2.payload.sessionId);
			expect(event1.payload.sessionId).toMatch(/^session-/);
			expect(event2.payload.sessionId).toMatch(/^session-/);
		});

		it('should throw error when userId is empty', () => {
			expect(() => {
				UserEventFactory.createSessionCreatedEvent('');
			}).toThrow('UserId is required');
		});

		it('should throw error when userId is null', () => {
			expect(() => {
				UserEventFactory.createSessionCreatedEvent(null as unknown as string);
			}).toThrow('UserId is required');
		});

		it('should throw error when userId is undefined', () => {
			expect(() => {
				UserEventFactory.createSessionCreatedEvent(undefined as unknown as string);
			}).toThrow('UserId is required');
		});
	});

	describe('event structure validation', () => {
		it('should create events with proper structure for user registered', () => {
			const providerUserInfo: ProviderUserInfo = {
				id: 'google-123',
				email: 'test@example.com',
				emailVerified: true,
				name: 'Test User'
			};

			const event = UserEventFactory.createUserRegisteredEvent(providerUserInfo, 'google');

			// Check event structure
			expect(event).toHaveProperty('type');
			expect(event).toHaveProperty('payload');
			expect(event.payload).toHaveProperty('userId');
			expect(event.payload).toHaveProperty('email');
			expect(event.payload).toHaveProperty('name');
			expect(event.payload).toHaveProperty('provider');
			expect(event.payload).toHaveProperty('providerId');
			expect(event.payload).toHaveProperty('registeredAt');
		});

		it('should create events with proper structure for user logged in', () => {
			const event = UserEventFactory.createUserLoggedInEvent('user-123');

			expect(event).toHaveProperty('type');
			expect(event).toHaveProperty('payload');
			expect(event.payload).toHaveProperty('userId');
			expect(event.payload).toHaveProperty('loginAt');
		});

		it('should create events with proper structure for session created', () => {
			const event = UserEventFactory.createSessionCreatedEvent('user-123');

			expect(event).toHaveProperty('type');
			expect(event).toHaveProperty('payload');
			expect(event.payload).toHaveProperty('sessionId');
			expect(event.payload).toHaveProperty('userId');
			expect(event.payload).toHaveProperty('createdAt');
			expect(event.payload).toHaveProperty('expiresAt');
		});
	});
});
