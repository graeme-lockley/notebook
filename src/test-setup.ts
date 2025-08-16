import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock SvelteKit modules
vi.mock('$app/environment', () => ({
	browser: true,
	dev: true,
	prerendering: false
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidate: vi.fn(),
	invalidateAll: vi.fn(),
	preloadData: vi.fn(),
	preloadCode: vi.fn()
}));

vi.mock('$app/stores', () => ({
	page: { subscribe: vi.fn() },
	navigating: { subscribe: vi.fn() },
	updated: { subscribe: vi.fn() }
}));

// Mock browser APIs
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(), // deprecated
		removeListener: vi.fn(), // deprecated
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	}))
});

// Mock ResizeObserver
Object.defineProperty(window, 'ResizeObserver', {
	writable: true,
	value: vi.fn().mockImplementation(() => ({
		observe: vi.fn(),
		unobserve: vi.fn(),
		disconnect: vi.fn()
	}))
});

// Mock IntersectionObserver
Object.defineProperty(window, 'IntersectionObserver', {
	writable: true,
	value: vi.fn().mockImplementation(() => ({
		observe: vi.fn(),
		unobserve: vi.fn(),
		disconnect: vi.fn()
	}))
});

// Mock requestAnimationFrame
Object.defineProperty(window, 'requestAnimationFrame', {
	writable: true,
	value: vi.fn((cb) => setTimeout(cb, 0))
});

Object.defineProperty(window, 'cancelAnimationFrame', {
	writable: true,
	value: vi.fn()
});
