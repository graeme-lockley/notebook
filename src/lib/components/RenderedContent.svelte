<script lang="ts">
	import type { ReactiveCell } from '$lib/model/cell';
	import { onDestroy, onMount } from 'svelte';
	import ObservableValueRenderer from './ObservableValueRenderer.svelte';
	import type { ObservableValue } from '../../runtime';

	interface Props {
		cell: ReactiveCell;
	}

	let { cell }: Props = $props();

	let observerID: number | undefined = $state(undefined);

	let status = $state('pending');
	let result = $state(null);

	onMount(() => {
		if (observerID === undefined) {
			observerID = cell.observers.addObserver({
				fulfilled: (value: ObservableValue): void => {
					status = 'ok';
					result = value;
				},
				pending: (): void => {
					status = 'pending';
					result = null;
				},
				rejected: (value?: ObservableValue): void => {
					status = 'error';
					result = value;
				}
			});
		}
	});

	onDestroy(() => {
		if (observerID != null) {
			cell.observers.removeObserver(observerID);
		}
	});
</script>

{#if cell.valueError !== null}
	<div class="error-state">
		<div class="error-icon">⚠️</div>
		<div class="error-message">
			<strong>Error:</strong>
			{cell.valueError || 'Unknown error (1)'}
		</div>
	</div>
{:else if status === 'pending'}
	<div class="loading-state">
		<div class="loading-spinner"></div>
		<p>Executing...</p>
	</div>
{:else if status === 'error'}
	<div class="error-state">
		<div class="error-icon">⚠️</div>
		<div class="error-message">
			<strong>Error:</strong>
			{result || 'Unknown error (2)'}
		</div>
	</div>
{:else}
	<ObservableValueRenderer value={result} kind={cell.kind} />
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
</style>
