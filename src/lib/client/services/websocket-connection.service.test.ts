import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocketConnectionService } from './websocket-connection.service';

// Mock the logger
vi.mock('$lib/common/infrastructure/logging/logger.service', () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		configure: vi.fn()
	}
}));

// Mock WebSocket
class MockWebSocket {
	static OPEN = 1;
	static CONNECTING = 0;
	static CLOSING = 2;
	static CLOSED = 3;

	readyState = MockWebSocket.CONNECTING;
	url: string;
	onopen: ((event: Event) => void) | null = null;
	onmessage: ((event: MessageEvent) => void) | null = null;
	onclose: ((event: CloseEvent) => void) | null = null;
	onerror: ((event: Event) => void) | null = null;

	constructor(url: string) {
		this.url = url;
		// Simulate async connection
		setTimeout(() => {
			this.readyState = MockWebSocket.OPEN;
			this.onopen?.(new Event('open'));
		}, 0);
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	send(_data: string) {
		// Mock send
	}

	close() {
		this.readyState = MockWebSocket.CLOSED;
		this.onclose?.(new CloseEvent('close'));
	}
}

describe('WebSocketConnectionService', () => {
	let service: WebSocketConnectionService;
	let originalWebSocket: typeof WebSocket;

	beforeEach(() => {
		service = new WebSocketConnectionService();
		originalWebSocket = globalThis.WebSocket;
		globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
		vi.clearAllMocks();
	});

	afterEach(() => {
		globalThis.WebSocket = originalWebSocket;
		service.disconnect();
	});

	describe('connect', () => {
		it('should establish WebSocket connection', async () => {
			service.connect('notebook-1');

			// Wait for async connection
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(service.isConnected()).toBe(true);
			expect(service.getState()).toBe('connected');
		});

		it('should close existing connection before connecting', async () => {
			service.connect('notebook-1');
			await new Promise((resolve) => setTimeout(resolve, 10));

			const firstConnected = service.isConnected();

			service.connect('notebook-2');
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(firstConnected).toBe(true);
			expect(service.isConnected()).toBe(true);
		});
	});

	describe('disconnect', () => {
		it('should close WebSocket connection', async () => {
			service.connect('notebook-1');
			await new Promise((resolve) => setTimeout(resolve, 10));

			service.disconnect();

			expect(service.isConnected()).toBe(false);
			expect(service.getState()).toBe('disconnected');
		});

		it('should clear reconnect timeout', async () => {
			service.connect('notebook-1');
			await new Promise((resolve) => setTimeout(resolve, 10));

			service.disconnect();
			// Should not attempt reconnection after disconnect
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(service.getState()).toBe('disconnected');
		});
	});

	describe('send', () => {
		it('should send message when connected', async () => {
			service.connect('notebook-1');
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Should not throw
			expect(() => service.send({ type: 'test' })).not.toThrow();
		});

		it('should not send message when disconnected', () => {
			// Should not throw, but log error
			expect(() => service.send({ type: 'test' })).not.toThrow();
		});
	});

	describe('onMessage', () => {
		it('should register message handler', async () => {
			const handler = vi.fn();
			service.onMessage(handler);

			service.connect('notebook-1');
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Simulate incoming message
			const mockMessage = { type: 'test', data: 'value' };
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const ws = (service as any).websocket as MockWebSocket;
			ws.onmessage?.(
				new MessageEvent('message', {
					data: JSON.stringify(mockMessage)
				})
			);

			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(handler).toHaveBeenCalledWith(mockMessage);
		});

		it('should allow multiple message handlers', async () => {
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			service.onMessage(handler1);
			service.onMessage(handler2);

			service.connect('notebook-1');
			await new Promise((resolve) => setTimeout(resolve, 10));

			const mockMessage = { type: 'test' };
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const ws = (service as any).websocket as MockWebSocket;
			ws.onmessage?.(
				new MessageEvent('message', {
					data: JSON.stringify(mockMessage)
				})
			);

			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(handler1).toHaveBeenCalled();
			expect(handler2).toHaveBeenCalled();
		});

		it('should unsubscribe handler', async () => {
			const handler = vi.fn();
			const unsubscribe = service.onMessage(handler);

			service.connect('notebook-1');
			await new Promise((resolve) => setTimeout(resolve, 10));

			unsubscribe();

			const mockMessage = { type: 'test' };
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const ws = (service as any).websocket as MockWebSocket;
			ws.onmessage?.(
				new MessageEvent('message', {
					data: JSON.stringify(mockMessage)
				})
			);

			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(handler).not.toHaveBeenCalled();
		});
	});

	describe('onStateChange', () => {
		it('should register state change handler', async () => {
			const handler = vi.fn();
			service.onStateChange(handler);

			// Should be called immediately with current state
			expect(handler).toHaveBeenCalledWith('disconnected');

			service.connect('notebook-1');
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(handler).toHaveBeenCalledWith('connecting');
			expect(handler).toHaveBeenCalledWith('connected');
		});

		it('should unsubscribe state handler', () => {
			const handler = vi.fn();
			const unsubscribe = service.onStateChange(handler);

			vi.clearAllMocks();
			unsubscribe();

			service.connect('notebook-1');
			// Handler should not be called after unsubscribe
			expect(handler).not.toHaveBeenCalled();
		});
	});

	describe('getState', () => {
		it('should return current connection state', () => {
			expect(service.getState()).toBe('disconnected');
		});

		it('should update state during connection', async () => {
			service.connect('notebook-1');
			expect(service.getState()).toBe('connecting');

			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(service.getState()).toBe('connected');
		});
	});

	describe('isConnected', () => {
		it('should return false when disconnected', () => {
			expect(service.isConnected()).toBe(false);
		});

		it('should return true when connected', async () => {
			service.connect('notebook-1');
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(service.isConnected()).toBe(true);
		});

		it('should return false after disconnect', async () => {
			service.connect('notebook-1');
			await new Promise((resolve) => setTimeout(resolve, 10));

			service.disconnect();

			expect(service.isConnected()).toBe(false);
		});
	});
});
