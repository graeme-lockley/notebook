import { test, expect } from '@playwright/test';

test.describe('FooterBar Responsive Behavior', () => {
	test('renders correctly on desktop', async ({ page }) => {
		await page.goto('/');

		// Check that FooterBar is visible
		const footerBar = page.getByTestId('footerbar');
		await expect(footerBar).toBeVisible();

		// Check that all buttons are visible on desktop
		await expect(page.getByTestId('add-cell-button')).toBeVisible();
		await expect(page.getByTestId('run-all-button')).toBeVisible();
		await expect(page.getByTestId('settings-button')).toBeVisible();
		await expect(page.getByTestId('view-mode-switcher')).toBeVisible();
	});

	test('renders correctly on mobile', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/');

		// Check that FooterBar is visible
		const footerBar = page.getByTestId('footerbar');
		await expect(footerBar).toBeVisible();

		// Check that all buttons are still visible (they should adapt to mobile)
		await expect(page.getByTestId('add-cell-button')).toBeVisible();
		await expect(page.getByTestId('run-all-button')).toBeVisible();
		await expect(page.getByTestId('settings-button')).toBeVisible();
		await expect(page.getByTestId('view-mode-switcher')).toBeVisible();
	});

	test('add cell type selector works on mobile', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/');

		// Click on add cell button
		const addCellButton = page.getByTestId('add-cell-button');
		await addCellButton.click();

		// Should show type selector
		await expect(page.getByText('JavaScript')).toBeVisible();
		await expect(page.getByText('Markdown')).toBeVisible();
		await expect(page.getByText('HTML')).toBeVisible();
	});
});
