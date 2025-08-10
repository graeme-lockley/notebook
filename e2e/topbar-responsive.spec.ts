import { test, expect } from '@playwright/test';

test.describe('TopBar Responsive Behavior', () => {
	test('renders correctly on desktop', async ({ page }) => {
		await page.goto('/');

		// Check that TopBar is visible
		const topBar = page.getByTestId('topbar');
		await expect(topBar).toBeVisible();

		// Check that all buttons are visible on desktop
		await expect(page.getByTestId('share-button')).toBeVisible();
		await expect(page.getByTestId('duplicate-button')).toBeVisible();
		await expect(page.getByTestId('download-button')).toBeVisible();

		// Check that title is visible
		await expect(page.getByTestId('title-button')).toBeVisible();
	});

	test('renders correctly on mobile', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/');

		// Check that TopBar is visible
		const topBar = page.getByTestId('topbar');
		await expect(topBar).toBeVisible();

		// Check that all buttons are still visible (they should adapt to mobile)
		await expect(page.getByTestId('share-button')).toBeVisible();
		await expect(page.getByTestId('duplicate-button')).toBeVisible();
		await expect(page.getByTestId('download-button')).toBeVisible();

		// Check that title is visible
		await expect(page.getByTestId('title-button')).toBeVisible();
	});

	test('title editing works on mobile', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/');

		// Click on title to edit
		const titleButton = page.getByTestId('title-button');
		await titleButton.click();

		// Should show input field
		const titleInput = page.getByTestId('title-input');
		await expect(titleInput).toBeVisible();
	});
});
