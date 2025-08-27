<script lang="ts">
	import type { Cell } from '$lib/types/cell';
	import ObservableValueRenderer from './ObservableValueRenderer.svelte';

	interface Props {
		cell: Cell;
	}

	let { cell }: Props = $props();

	// Create a reactive wrapper for the cell
	let cellData = $derived({
		id: cell.id,
		status: cell.status,
		result: cell.result,
		value: cell.result?.value,
		html: cell.result?.html || null
	});

	function sanitizeHtml(html: string): string {
		// Basic HTML sanitization - in production, use DOMPurify
		return html
			.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
			.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
			.replace(/javascript:/gi, '')
			.replace(/on\w+\s*=/gi, '');
	}
</script>

{#if cellData.status === 'pending'}
	<div class="loading-state">
		<div class="loading-spinner"></div>
		<p>Executing...</p>
	</div>
{:else if cellData.status === 'error'}
	<div class="error-state">
		<div class="error-icon">⚠️</div>
		<div class="error-message">
			<strong>Error:</strong>
			{cellData.result?.error?.message || 'Unknown error'}
		</div>
	</div>
{:else if cellData.status === 'ok'}
	{#if cellData.value !== undefined && cellData.value !== null}
		<ObservableValueRenderer value={cellData.value} />
	{:else if cellData.html}
		<div class="html-output">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html sanitizeHtml(cellData.html)}
		</div>
	{:else}
		<div class="no-output">
			<p>No output</p>
		</div>
	{/if}
{:else}
	<div class="no-output">
		<p>No output</p>
	</div>
{/if}

<style>
	.loading-state {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
		color: var(--color-gray-600);
	}

	.loading-spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid var(--color-gray-200);
		border-top: 2px solid var(--color-blue-500);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.error-state {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.75rem;
		background-color: var(--color-red-50);
		border: 1px solid var(--color-red-200);
		border-radius: 0.375rem;
		color: var(--color-red-800);
		font-size: 0.875rem;
	}

	.error-icon {
		font-size: 1rem;
		flex-shrink: 0;
	}

	.error-message {
		flex: 1;
	}

	.html-output {
		width: 100%;
	}

	.no-output {
		padding: 1rem;
		color: var(--color-gray-500);
		font-style: italic;
		text-align: center;
	}
</style>
