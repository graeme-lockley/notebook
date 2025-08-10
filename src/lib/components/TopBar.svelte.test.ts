import { render, screen, cleanup } from '@testing-library/svelte';
import { describe, it, expect, afterEach } from 'vitest';
import TopBar from './TopBar.svelte';

describe('TopBar', () => {
	afterEach(() => {
		cleanup();
	});

	it('renders without crashing', () => {
		render(TopBar);
		expect(screen.getByTestId('topbar')).toBeDefined();
	});

	it('displays document title', () => {
		render(TopBar, { props: { title: 'Test Notebook' } });
		expect(screen.getByText('Test Notebook')).toBeDefined();
	});

	it('shows last edited timestamp', () => {
		const lastEdited = new Date('2024-01-01T12:00:00Z');
		render(TopBar, { props: { lastEdited } });
		expect(screen.getByText(/Jan 1, 2024/)).toBeDefined();
	});

	it('displays version number', () => {
		render(TopBar, { props: { version: '1.0.0' } });
		expect(screen.getByText('v1.0.0')).toBeDefined();
	});

	it('has share button', () => {
		render(TopBar);
		expect(screen.getByTestId('share-button')).toBeDefined();
	});

	it('has duplicate button', () => {
		render(TopBar);
		expect(screen.getByTestId('duplicate-button')).toBeDefined();
	});

	it('has download button', () => {
		render(TopBar);
		expect(screen.getByTestId('download-button')).toBeDefined();
	});

	it('allows editing title when clicked', async () => {
		render(TopBar, { props: { title: 'Original Title' } });
		const titleButton = screen.getByTestId('title-button');

		await titleButton.click();

		// After clicking, the title should become an input
		const titleInput = screen.getByTestId('title-input');
		expect(titleInput).toBeDefined();
		expect((titleInput as HTMLInputElement).value).toBe('Original Title');
	});

	it('has share button that can be clicked', async () => {
		render(TopBar);
		const shareButton = screen.getByTestId('share-button');
		expect(shareButton).toBeDefined();
		await shareButton.click();
	});

	it('has duplicate button that can be clicked', async () => {
		render(TopBar);
		const duplicateButton = screen.getByTestId('duplicate-button');
		expect(duplicateButton).toBeDefined();
		await duplicateButton.click();
	});

	it('has download button that can be clicked', async () => {
		render(TopBar);
		const downloadButton = screen.getByTestId('download-button');
		expect(downloadButton).toBeDefined();
		await downloadButton.click();
	});
});
