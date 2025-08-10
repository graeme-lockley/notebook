import { render, screen, cleanup } from '@testing-library/svelte';
import { describe, it, expect, afterEach } from 'vitest';
import FooterBar from './FooterBar.svelte';

describe('FooterBar', () => {
	afterEach(() => {
		cleanup();
	});

	it('renders without crashing', () => {
		render(FooterBar);
		expect(screen.getByTestId('footerbar')).toBeDefined();
	});

	it('has add cell button', () => {
		render(FooterBar);
		expect(screen.getByTestId('add-cell-button')).toBeDefined();
	});

	it('has run all button', () => {
		render(FooterBar);
		expect(screen.getByTestId('run-all-button')).toBeDefined();
	});

	it('has settings button', () => {
		render(FooterBar);
		expect(screen.getByTestId('settings-button')).toBeDefined();
	});

	it('has view mode switcher', () => {
		render(FooterBar);
		expect(screen.getByTestId('view-mode-switcher')).toBeDefined();
	});

	it('shows add cell button with type selector', async () => {
		render(FooterBar);
		const addCellButton = screen.getByTestId('add-cell-button');
		expect(addCellButton).toBeDefined();
		await addCellButton.click();
	});

	it('shows run all button', async () => {
		render(FooterBar);
		const runAllButton = screen.getByTestId('run-all-button');
		expect(runAllButton).toBeDefined();
		await runAllButton.click();
	});

	it('shows settings button', async () => {
		render(FooterBar);
		const settingsButton = screen.getByTestId('settings-button');
		expect(settingsButton).toBeDefined();
		await settingsButton.click();
	});

	it('shows view mode switcher', async () => {
		render(FooterBar);
		const viewModeSwitcher = screen.getByTestId('view-mode-switcher');
		expect(viewModeSwitcher).toBeDefined();
		await viewModeSwitcher.click();
	});
});
