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
		kind: cell.kind,
		status: cell.status,
		result: cell.result,
		value: cell.result?.value,
		html: cell.result?.html || null
	});
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
		<ObservableValueRenderer value={cellData.value} kind={cellData.kind} />
	{:else if cellData.html}
		<div class="html-output">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html cellData.html}
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

	/* HTML content styling for rendered output */
	.html-output :global(h1),
	.html-output :global(h2),
	.html-output :global(h3),
	.html-output :global(h4),
	.html-output :global(h5),
	.html-output :global(h6) {
		margin: 1rem 0 0.5rem 0;
		font-weight: var(--font-weight-semibold);
		line-height: 1.25;
	}

	.html-output :global(h1) {
		font-size: 1.5rem;
	}

	.html-output :global(h2) {
		font-size: 1.25rem;
	}

	.html-output :global(h3) {
		font-size: 1.125rem;
	}

	.html-output :global(p) {
		margin: 0.5rem 0;
		line-height: 1.6;
	}

	.html-output :global(ul),
	.html-output :global(ol) {
		margin: 0.5rem 0;
		padding-left: 1.5rem;
	}

	.html-output :global(li) {
		margin: 0.25rem 0;
		line-height: 1.5;
	}

	.html-output :global(ul li) {
		list-style-type: disc;
	}

	.html-output :global(ol li) {
		list-style-type: decimal;
	}

	.html-output :global(blockquote) {
		margin: 0.5rem 0;
		padding-left: 1rem;
		border-left: 3px solid var(--color-gray-300);
		color: var(--color-gray-600);
	}

	.html-output :global(code) {
		background-color: var(--color-gray-100);
		padding: 0.125rem 0.25rem;
		border-radius: 0.25rem;
		font-family: var(--font-family-mono);
		font-size: 0.875em;
	}

	.html-output :global(pre) {
		background-color: var(--color-gray-100);
		padding: 1rem;
		border-radius: 0.375rem;
		overflow-x: auto;
		margin: 0.5rem 0;
	}

	.html-output :global(pre code) {
		background-color: transparent;
		padding: 0;
	}

	.html-output :global(strong) {
		font-weight: var(--font-weight-semibold);
	}

	.html-output :global(em) {
		font-style: italic;
	}

	.html-output :global(a) {
		color: var(--color-primary);
		text-decoration: underline;
	}

	.html-output :global(a:hover) {
		color: var(--color-primary-hover);
	}

	.no-output {
		padding: 1rem;
		color: var(--color-gray-500);
		font-style: italic;
		text-align: center;
	}
</style>
