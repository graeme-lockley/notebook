import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Playwright helper utilities for UI testing
 */

/**
 * Wait for a condition to be true with timeout
 */
export async function waitFor(
	page: Page,
	condition: () => Promise<boolean>,
	timeout: number = 5000,
	interval: number = 100
): Promise<void> {
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		if (await condition()) {
			return;
		}
		await page.waitForTimeout(interval);
	}

	throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Wait for an element to be visible
 */
export async function waitForElement(
	page: Page,
	selector: string,
	timeout: number = 5000
): Promise<Locator> {
	const element = page.locator(selector);
	await element.waitFor({ state: 'visible', timeout });
	return element;
}

/**
 * Wait for an element to be hidden
 */
export async function waitForElementHidden(
	page: Page,
	selector: string,
	timeout: number = 5000
): Promise<void> {
	const element = page.locator(selector);
	await element.waitFor({ state: 'hidden', timeout });
}

/**
 * Click an element and wait for it to be visible first
 */
export async function clickElement(page: Page, selector: string): Promise<void> {
	const element = await waitForElement(page, selector);
	await element.click();
}

/**
 * Type text into an input element
 */
export async function typeInElement(page: Page, selector: string, text: string): Promise<void> {
	const element = await waitForElement(page, selector);
	await element.fill(text);
}

/**
 * Press a key on an element
 */
export async function pressKey(page: Page, selector: string, key: string): Promise<void> {
	const element = await waitForElement(page, selector);
	await element.press(key);
}

/**
 * Hover over an element
 */
export async function hoverElement(page: Page, selector: string): Promise<void> {
	const element = await waitForElement(page, selector);
	await element.hover();
}

/**
 * Check if an element exists
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
	const element = page.locator(selector);
	return (await element.count()) > 0;
}

/**
 * Get text content of an element
 */
export async function getElementText(page: Page, selector: string): Promise<string> {
	const element = await waitForElement(page, selector);
	return (await element.textContent()) || '';
}

/**
 * Get attribute value of an element
 */
export async function getElementAttribute(
	page: Page,
	selector: string,
	attribute: string
): Promise<string | null> {
	const element = await waitForElement(page, selector);
	return await element.getAttribute(attribute);
}

/**
 * Check if an element has a specific class
 */
export async function hasClass(page: Page, selector: string, className: string): Promise<boolean> {
	const element = await waitForElement(page, selector);
	const classAttribute = await element.getAttribute('class');
	return classAttribute?.includes(className) || false;
}

/**
 * Wait for page to be ready (network idle)
 */
export async function waitForPageReady(page: Page): Promise<void> {
	await page.waitForLoadState('networkidle');
}

/**
 * Navigate to a page and wait for it to be ready
 */
export async function navigateToPage(page: Page, url: string): Promise<void> {
	await page.goto(url);
	await waitForPageReady(page);
}

/**
 * Take a screenshot with timestamp
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	await page.screenshot({ path: `test-results/screenshot-${name}-${timestamp}.png` });
}

/**
 * Test constants for UI testing
 */
export const UI_CONSTANTS = {
	SELECTORS: {
		CELL: '[data-testid="cell"]',
		CELL_EDITOR: '[data-testid="cell-editor"]',
		CELL_OUTPUT: '[data-testid="cell-output"]',
		ADD_CELL_BUTTON: '[data-testid="add-cell"]',
		RUN_BUTTON: '[data-testid="run-button"]',
		KEBAB_MENU: '[data-testid="cell-menu"]',
		TOP_BAR: '[data-testid="top-bar"]',
		FOOTER_BAR: '[data-testid="footer-bar"]',
		LEFT_RAIL: '[data-testid="left-rail"]',
		CELL_SHELL: '[data-testid="cell-shell"]',
		CELL_MENU: '[data-testid="cell-menu"]',
		ADD_CELL_BETWEEN: '[data-testid="add-cell-between"]',
		OUTPUT_PANEL: '[data-testid="output-panel"]',
		SHORTCUTS_HELP: '[data-testid="shortcuts-help"]'
	},
	TIMEOUTS: {
		SHORT: 1000,
		MEDIUM: 3000,
		LONG: 10000
	},
	URLS: {
		HOME: '/',
		EDITOR: '/n/test-notebook'
	}
};

/**
 * Common test actions for the ObservableHQ clone
 */
export class ObservableHQActions {
	constructor(private page: Page) {}

	/**
	 * Navigate to the editor page
	 */
	async navigateToEditor(notebookId: string = 'test-notebook'): Promise<void> {
		await navigateToPage(this.page, `/n/${notebookId}`);
	}

	/**
	 * Add a new cell
	 */
	async addCell(type: 'js' | 'md' | 'html' = 'js'): Promise<void> {
		await clickElement(this.page, UI_CONSTANTS.SELECTORS.ADD_CELL_BUTTON);
		// Wait for type selector and click the appropriate type
		await clickElement(this.page, `[data-testid="cell-type-${type}"]`);
	}

	/**
	 * Edit a cell
	 */
	async editCell(cellIndex: number, content: string): Promise<void> {
		const cellSelector = `${UI_CONSTANTS.SELECTORS.CELL}:nth-child(${cellIndex + 1}) ${UI_CONSTANTS.SELECTORS.CELL_EDITOR}`;
		await typeInElement(this.page, cellSelector, content);
	}

	/**
	 * Run a cell
	 */
	async runCell(cellIndex: number): Promise<void> {
		const runButtonSelector = `${UI_CONSTANTS.SELECTORS.CELL}:nth-child(${cellIndex + 1}) ${UI_CONSTANTS.SELECTORS.RUN_BUTTON}`;
		await clickElement(this.page, runButtonSelector);
	}

	/**
	 * Open cell menu
	 */
	async openCellMenu(cellIndex: number): Promise<void> {
		const menuButtonSelector = `${UI_CONSTANTS.SELECTORS.CELL}:nth-child(${cellIndex + 1}) ${UI_CONSTANTS.SELECTORS.KEBAB_MENU}`;
		await clickElement(this.page, menuButtonSelector);
	}

	/**
	 * Pin/unpin a cell
	 */
	async toggleCellPin(cellIndex: number): Promise<void> {
		await this.openCellMenu(cellIndex);
		await clickElement(this.page, '[data-testid="menu-item-pin"]');
	}

	/**
	 * Delete a cell
	 */
	async deleteCell(cellIndex: number): Promise<void> {
		await this.openCellMenu(cellIndex);
		await clickElement(this.page, '[data-testid="menu-item-delete"]');
		// Confirm deletion if there's a confirmation dialog
		const confirmButton = this.page.locator('[data-testid="confirm-delete"]');
		if ((await confirmButton.count()) > 0) {
			await confirmButton.click();
		}
	}

	/**
	 * Check if cell output contains expected text
	 */
	async expectCellOutput(cellIndex: number, expectedText: string): Promise<void> {
		const outputSelector = `${UI_CONSTANTS.SELECTORS.CELL}:nth-child(${cellIndex + 1}) ${UI_CONSTANTS.SELECTORS.CELL_OUTPUT}`;
		const outputText = await getElementText(this.page, outputSelector);
		expect(outputText).toContain(expectedText);
	}

	/**
	 * Check if cell has error state
	 */
	async expectCellError(cellIndex: number): Promise<void> {
		const cellSelector = `${UI_CONSTANTS.SELECTORS.CELL}:nth-child(${cellIndex + 1})`;
		await expect(this.page.locator(`${cellSelector} [data-testid="cell-error"]`)).toBeVisible();
	}

	/**
	 * Check if cell is pinned
	 */
	async expectCellPinned(cellIndex: number): Promise<void> {
		const cellSelector = `${UI_CONSTANTS.SELECTORS.CELL}:nth-child(${cellIndex + 1})`;
		await expect(this.page.locator(`${cellSelector} [data-testid="cell-pinned"]`)).toBeVisible();
	}
}
