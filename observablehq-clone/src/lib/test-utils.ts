import { render, type RenderResult } from '@testing-library/svelte';
import type { ComponentType } from 'svelte';
import { tick } from 'svelte';

/**
 * Common test utilities for the ObservableHQ clone project
 */

/**
 * Render a Svelte component with common test setup
 */
export function renderComponent<T extends Record<string, any>>(
	Component: ComponentType<T>,
	props: T = {} as T
): RenderResult {
	return render(Component, { props });
}

/**
 * Wait for all pending promises and Svelte updates
 */
export async function waitForUpdates(): Promise<void> {
	await tick();
	await new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Mock data for testing
 */
export const mockData = {
	notebook: {
		id: 'test-notebook-1',
		title: 'Test Notebook',
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z',
		version: 1,
		cellOrder: ['cell-1', 'cell-2']
	},
	cells: [
		{
			id: 'cell-1',
			kind: 'js' as const,
			source: 'console.log("Hello, World!");',
			meta: { pinned: false, collapsed: false },
			deps: [],
			exports: [],
			lastRun: {
				status: 'ok' as const,
				valueHtml: '<div>Hello, World!</div>',
				console: ['Hello, World!']
			}
		},
		{
			id: 'cell-2',
			kind: 'md' as const,
			source: '# Markdown Cell\n\nThis is a markdown cell.',
			meta: { pinned: false, collapsed: false },
			deps: [],
			exports: [],
			lastRun: {
				status: 'ok' as const,
				valueHtml: '<h1>Markdown Cell</h1><p>This is a markdown cell.</p>'
			}
		}
	]
};

/**
 * Test constants
 */
export const TEST_CONSTANTS = {
	TIMEOUTS: {
		SHORT: 100,
		MEDIUM: 500,
		LONG: 1000
	},
	SELECTORS: {
		CELL: '[data-testid="cell"]',
		CELL_EDITOR: '[data-testid="cell-editor"]',
		CELL_OUTPUT: '[data-testid="cell-output"]',
		ADD_CELL_BUTTON: '[data-testid="add-cell"]',
		RUN_BUTTON: '[data-testid="run-button"]',
		KEBAB_MENU: '[data-testid="cell-menu"]'
	}
};

/**
 * Helper to create a mock event
 */
export function createMockEvent(type: string, target?: HTMLElement): Event {
	return new Event(type, { bubbles: true, cancelable: true });
}

/**
 * Helper to create a mock keyboard event
 */
export function createMockKeyboardEvent(
	type: string,
	key: string,
	modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean } = {}
): KeyboardEvent {
	return new KeyboardEvent(type, {
		key,
		ctrlKey: modifiers.ctrl || false,
		shiftKey: modifiers.shift || false,
		altKey: modifiers.alt || false,
		metaKey: modifiers.meta || false,
		bubbles: true,
		cancelable: true
	});
}

/**
 * Helper to create a mock mouse event
 */
export function createMockMouseEvent(
	type: string,
	button: number = 0,
	modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean } = {}
): MouseEvent {
	return new MouseEvent(type, {
		button,
		ctrlKey: modifiers.ctrl || false,
		shiftKey: modifiers.shift || false,
		altKey: modifiers.alt || false,
		metaKey: modifiers.meta || false,
		bubbles: true,
		cancelable: true
	});
}

/**
 * Helper to wait for a condition to be true
 */
export async function waitFor(
	condition: () => boolean | Promise<boolean>,
	timeout: number = 5000,
	interval: number = 100
): Promise<void> {
	const startTime = Date.now();
	
	while (Date.now() - startTime < timeout) {
		if (await condition()) {
			return;
		}
		await new Promise(resolve => setTimeout(resolve, interval));
	}
	
	throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Helper to wait for an element to be present in the DOM
 */
export async function waitForElement(selector: string, timeout: number = 5000): Promise<HTMLElement> {
	await waitFor(() => !!document.querySelector(selector), timeout);
	return document.querySelector(selector) as HTMLElement;
}

/**
 * Helper to wait for an element to be removed from the DOM
 */
export async function waitForElementRemoved(selector: string, timeout: number = 5000): Promise<void> {
	await waitFor(() => !document.querySelector(selector), timeout);
}

/**
 * Helper to simulate user typing in an input element
 */
export async function typeInElement(element: HTMLElement, text: string): Promise<void> {
	if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
		element.focus();
		element.value = text;
		element.dispatchEvent(new Event('input', { bubbles: true }));
		element.dispatchEvent(new Event('change', { bubbles: true }));
		await waitForUpdates();
	}
}

/**
 * Helper to simulate clicking an element
 */
export async function clickElement(element: HTMLElement): Promise<void> {
	element.click();
	await waitForUpdates();
}

/**
 * Helper to simulate pressing a key on an element
 */
export async function pressKey(element: HTMLElement, key: string): Promise<void> {
	element.dispatchEvent(createMockKeyboardEvent('keydown', key));
	element.dispatchEvent(createMockKeyboardEvent('keyup', key));
	await waitForUpdates();
}
