import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionService } from './session.service';
import type { EventStore } from '../ports/outbound/event-store';
import type { EventBus } from '../ports/outbound/event-bus';
import type { SessionReadModel } from '../ports/inbound/session-read-model';
import type { User } from '$lib/server/domain/value-objects';

describe('SessionService', () => {
	let sessionService: SessionService;
	let mockEventStore: EventStore;
	let mockEventBus: EventBus;
	let mockSessionReadModel: SessionReadModel;

	beforeEach(() => {
		// Mock event store
		mockEventStore = {
			publishEvent: vi.fn().mockResolvedValue('event-id-123')
		} as unknown as EventStore;

		// Mock event bus
		mockEventBus = {
			publish: vi.fn().mockResolvedValue(undefined)
		} as unknown as EventBus;

		// Mock session read model
		mockSessionReadModel = {
			getSessionById: vi.fn(),
			getUserBySessionId: vi.fn(),
			getSessionsByUserId: vi.fn(),
			isValidSession: vi.fn()
		} as unknown as SessionReadModel;

		sessionService = new SessionService(mockEventStore, mockEventBus, mockSessionReadModel);
	});

	describe('createSession', () => {
		it('should create session and publish events', async () => {
			const userId = 'user-123';
			const sessionId = await sessionService.createSession(userId);

			expect(sessionId).toMatch(/^session-\d+-[a-z0-9]{14}$/);
			expect(mockEventStore.publishEvent).toHaveBeenCalledWith(
				'sessions',
				'session.created',
				expect.objectContaining({
					sessionId: expect.any(String),
					userId,
					createdAt: expect.any(String),
					expiresAt: expect.any(String)
				})
			);
			expect(mockEventBus.publish).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'session.created',
					payload: expect.objectContaining({
						sessionId: expect.any(String),
						userId
					})
				})
			);
		});

		it('should create session with correct expiration time', async () => {
			const userId = 'user-123';
			const beforeTime = new Date();
			const sessionId = await sessionService.createSession(userId);
			const afterTime = new Date();

			expect(mockEventStore.publishEvent).toHaveBeenCalledWith(
				'sessions',
				'session.created',
				expect.objectContaining({
					sessionId,
					userId,
					createdAt: expect.any(String),
					expiresAt: expect.any(String)
				})
			);

			// Verify the event payload was called
			const publishEventCall = (mockEventStore.publishEvent as ReturnType<typeof vi.fn>).mock
				.calls[0];
			const eventPayload = publishEventCall[2];
			const createdAt = new Date(eventPayload.createdAt);
			const expiresAt = new Date(eventPayload.expiresAt);

			expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
			expect(createdAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());

			// Should expire in 7 days
			const expectedExpiresAt = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
			expect(expiresAt.getTime()).toBeCloseTo(expectedExpiresAt.getTime(), -3); // Allow for slight ms difference
		});

		it('should handle event store errors', async () => {
			(mockEventStore.publishEvent as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error('Event store error')
			);

			await expect(sessionService.createSession('user-123')).rejects.toThrow('Event store error');
		});

		it('should handle event bus errors', async () => {
			(mockEventBus.publish as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error('Event bus error')
			);

			await expect(sessionService.createSession('user-123')).rejects.toThrow('Event bus error');
		});
	});

	describe('validateSession', () => {
		it('should return user for valid session', async () => {
			const mockUser: User = {
				id: 'user-123',
				email: 'test@example.com',
				name: 'Test User',
				provider: 'google',
				providerId: 'google-123',
				createdAt: new Date(),
				lastLoginAt: new Date()
			};

			(mockSessionReadModel.getUserBySessionId as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockUser
			);

			const result = await sessionService.validateSession('session-123');

			expect(result).toEqual(mockUser);
			expect(mockSessionReadModel.getUserBySessionId).toHaveBeenCalledWith('session-123');
		});

		it('should return null for invalid session', async () => {
			(mockSessionReadModel.getUserBySessionId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

			const result = await sessionService.validateSession('invalid-session');

			expect(result).toBeNull();
			expect(mockSessionReadModel.getUserBySessionId).toHaveBeenCalledWith('invalid-session');
		});

		it('should return null for expired session', async () => {
			(mockSessionReadModel.getUserBySessionId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

			const result = await sessionService.validateSession('expired-session');

			expect(result).toBeNull();
		});

		it('should handle read model errors', async () => {
			(mockSessionReadModel.getUserBySessionId as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error('Read model error')
			);

			await expect(sessionService.validateSession('session-123')).rejects.toThrow(
				'Read model error'
			);
		});
	});

	describe('invalidateSession', () => {
		it('should invalidate session and publish events', async () => {
			const sessionId = 'session-123';
			await sessionService.invalidateSession(sessionId);

			expect(mockEventStore.publishEvent).toHaveBeenCalledWith(
				'sessions',
				'session.expired',
				expect.objectContaining({
					sessionId,
					expiredAt: expect.any(String)
				})
			);
			expect(mockEventBus.publish).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'session.expired',
					payload: expect.objectContaining({
						sessionId
					})
				})
			);
		});

		it('should create expired event with current timestamp', async () => {
			const sessionId = 'session-123';
			const beforeTime = new Date();
			await sessionService.invalidateSession(sessionId);
			const afterTime = new Date();

			const publishEventCall = (mockEventStore.publishEvent as ReturnType<typeof vi.fn>).mock
				.calls[0];
			const eventPayload = publishEventCall[2];
			const expiredAt = new Date(eventPayload.expiredAt);

			expect(expiredAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
			expect(expiredAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
		});

		it('should handle event store errors', async () => {
			(mockEventStore.publishEvent as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error('Event store error')
			);

			await expect(sessionService.invalidateSession('session-123')).rejects.toThrow(
				'Event store error'
			);
		});

		it('should handle event bus errors', async () => {
			(mockEventBus.publish as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error('Event bus error')
			);

			await expect(sessionService.invalidateSession('session-123')).rejects.toThrow(
				'Event bus error'
			);
		});
	});
});
