import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebSocketMessageHandler, type WebSocketMessage } from './websocket-message-handler';

// Mock the logger
vi.mock('$lib/common/infrastructure/logging/logger.service', () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		configure: vi.fn()
	}
}));

describe('WebSocketMessageHandler', () => {
	let handler: WebSocketMessageHandler;

	beforeEach(() => {
		handler = new WebSocketMessageHandler();
		vi.clearAllMocks();
	});

	describe('registerHandler', () => {
		it('should register handler for message type', () => {
			const mockHandler = vi.fn();
			handler.registerHandler('test.event', mockHandler);

			expect(handler.getHandlerCount('test.event')).toBe(1);
		});

		it('should register multiple handlers for same type', () => {
			const mockHandler1 = vi.fn();
			const mockHandler2 = vi.fn();

			handler.registerHandler('test.event', mockHandler1);
			handler.registerHandler('test.event', mockHandler2);

			expect(handler.getHandlerCount('test.event')).toBe(2);
		});

		it('should return unsubscribe function', () => {
			const mockHandler = vi.fn();
			const unsubscribe = handler.registerHandler('test.event', mockHandler);

			unsubscribe();

			expect(handler.getHandlerCount('test.event')).toBe(0);
		});
	});

	describe('handleMessage', () => {
		it('should call registered handler', async () => {
			const mockHandler = vi.fn();
			handler.registerHandler('test.event', mockHandler);

			const message: WebSocketMessage = {
				type: 'test.event',
				data: { value: 'test' }
			};

			await handler.handleMessage(message);

			expect(mockHandler).toHaveBeenCalledWith(message);
		});

		it('should call all registered handlers', async () => {
			const mockHandler1 = vi.fn();
			const mockHandler2 = vi.fn();

			handler.registerHandler('test.event', mockHandler1);
			handler.registerHandler('test.event', mockHandler2);

			const message: WebSocketMessage = {
				type: 'test.event',
				data: {}
			};

			await handler.handleMessage(message);

			expect(mockHandler1).toHaveBeenCalled();
			expect(mockHandler2).toHaveBeenCalled();
		});

		it('should handle async handlers', async () => {
			const mockHandler = vi.fn().mockResolvedValue(undefined);
			handler.registerHandler('test.event', mockHandler);

			const message: WebSocketMessage = {
				type: 'test.event'
			};

			await handler.handleMessage(message);

			expect(mockHandler).toHaveBeenCalled();
		});

		it('should not throw if no handlers registered', async () => {
			const message: WebSocketMessage = {
				type: 'unhandled.event'
			};

			await expect(handler.handleMessage(message)).resolves.not.toThrow();
		});

		it('should handle invalid message format', async () => {
			const invalidMessage = { noType: true };

			await expect(handler.handleMessage(invalidMessage)).resolves.not.toThrow();
		});

		it('should handle null message', async () => {
			await expect(handler.handleMessage(null)).resolves.not.toThrow();
		});

		it('should continue if handler throws error', async () => {
			const errorHandler = vi.fn().mockRejectedValue(new Error('Handler error'));
			const successHandler = vi.fn();

			handler.registerHandler('test.event', errorHandler);
			handler.registerHandler('test.event', successHandler);

			const message: WebSocketMessage = {
				type: 'test.event'
			};

			await handler.handleMessage(message);

			expect(errorHandler).toHaveBeenCalled();
			expect(successHandler).toHaveBeenCalled();
		});
	});

	describe('clearHandlers', () => {
		it('should clear handlers for specific type', () => {
			const mockHandler = vi.fn();
			handler.registerHandler('test.event', mockHandler);

			handler.clearHandlers('test.event');

			expect(handler.getHandlerCount('test.event')).toBe(0);
		});

		it('should not affect other handlers', () => {
			const mockHandler1 = vi.fn();
			const mockHandler2 = vi.fn();

			handler.registerHandler('type1', mockHandler1);
			handler.registerHandler('type2', mockHandler2);

			handler.clearHandlers('type1');

			expect(handler.getHandlerCount('type1')).toBe(0);
			expect(handler.getHandlerCount('type2')).toBe(1);
		});
	});

	describe('clearAllHandlers', () => {
		it('should clear all handlers', () => {
			handler.registerHandler('type1', vi.fn());
			handler.registerHandler('type2', vi.fn());
			handler.registerHandler('type3', vi.fn());

			handler.clearAllHandlers();

			expect(handler.getHandlerCount('type1')).toBe(0);
			expect(handler.getHandlerCount('type2')).toBe(0);
			expect(handler.getHandlerCount('type3')).toBe(0);
		});
	});

	describe('getHandlerCount', () => {
		it('should return 0 for unregistered type', () => {
			expect(handler.getHandlerCount('nonexistent')).toBe(0);
		});

		it('should return correct count', () => {
			handler.registerHandler('test.event', vi.fn());
			handler.registerHandler('test.event', vi.fn());

			expect(handler.getHandlerCount('test.event')).toBe(2);
		});
	});

	describe('message routing', () => {
		it('should route messages by type', async () => {
			const cellHandler = vi.fn();
			const notebookHandler = vi.fn();

			handler.registerHandler('cell.created', cellHandler);
			handler.registerHandler('notebook.updated', notebookHandler);

			await handler.handleMessage({ type: 'cell.created', data: {} });

			expect(cellHandler).toHaveBeenCalled();
			expect(notebookHandler).not.toHaveBeenCalled();
		});

		it('should handle messages with payload', async () => {
			const mockHandler = vi.fn();
			handler.registerHandler('test.event', mockHandler);

			const message: WebSocketMessage = {
				type: 'test.event',
				payload: { value: 123 },
				eventId: 'event-1'
			};

			await handler.handleMessage(message);

			expect(mockHandler).toHaveBeenCalledWith(message);
		});
	});
});
