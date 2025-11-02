<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { X, Search as SearchIcon, Loader2, FileText } from 'lucide-svelte';
	import { notebookSearchService } from '$lib/client/services/notebook-search.service';
	import type { SearchNotebooksResponse } from '$lib/types/api-contracts';
	import { logger } from '$lib/common/infrastructure/logging/logger.service';
	import './modal-styles.css';

	let {
		isOpen = false,
		visibility: initialVisibility = 'all'
	}: {
		isOpen: boolean;
		visibility?: 'private' | 'public' | 'all';
	} = $props();

	const dispatch = createEventDispatcher<{
		select: { notebookId: string };
		close: void;
	}>();

	let searchQuery = $state('');
	let results = $state<SearchNotebooksResponse['notebooks']>([]);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let selectedIndex = $state(-1);
	let visibility = $state<'private' | 'public' | 'all'>(initialVisibility);
	let searchInput = $state<HTMLInputElement>();
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	// Reset state when modal opens/closes
	$effect(() => {
		if (isOpen) {
			searchQuery = '';
			results = [];
			error = null;
			selectedIndex = -1;
			isLoading = false;
			// Focus on search input after a brief delay
			setTimeout(() => searchInput?.focus(), 0);
		} else {
			// Clear any pending debounce
			if (debounceTimer) {
				clearTimeout(debounceTimer);
				debounceTimer = null;
			}
		}
	});

	async function performSearch(query: string) {
		if (!query.trim()) {
			results = [];
			isLoading = false;
			return;
		}

		isLoading = true;
		error = null;

		try {
			const searchResult = await notebookSearchService.search(query, {
				limit: 20,
				visibility: visibility === 'all' ? undefined : visibility
			});
			results = searchResult.notebooks;
			selectedIndex = -1;
			logger.debug(`SearchNotebookModal: Found ${results.length} results`);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Search failed';
			results = [];
			logger.error('SearchNotebookModal: Search error:', err);
		} finally {
			isLoading = false;
		}
	}

	// Debounced search
	function handleSearchInput(event: Event) {
		const target = event.target as HTMLInputElement;
		searchQuery = target.value;

		// Clear existing timer
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		// Set new timer
		debounceTimer = setTimeout(() => {
			performSearch(searchQuery);
		}, 300);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleClose();
		} else if (event.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
			handleSelect(results[selectedIndex].id);
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, -1);
		}
	}

	function handleSelect(notebookId: string) {
		logger.info(`SearchNotebookModal: Selected notebook ${notebookId}`);
		dispatch('select', { notebookId });
		handleClose();
	}

	function handleClose() {
		dispatch('close');
	}

	function handleVisibilityChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		visibility = target.value as 'private' | 'public' | 'all';
		// Re-search with new visibility filter
		if (searchQuery.trim()) {
			performSearch(searchQuery);
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
	<div
		class="modal-overlay"
		onclick={handleClose}
		onkeydown={(e) => {
			if (e.key === 'Escape') {
				handleClose();
			}
		}}
		role="button"
		tabindex="0"
		aria-label="Close search modal"
		data-testid="search-modal-overlay"
	>
		<div
			class="modal-container"
			onclick={(e) => {
				// Prevent clicks inside modal from closing it
				e.stopPropagation();
			}}
			onkeydown={(e) => {
				// Prevent keyboard events from bubbling to overlay
				e.stopPropagation();
			}}
			role="presentation"
			data-testid="search-modal"
		>
			<!-- Header -->
			<div class="modal-header">
				<h2 class="modal-title">Search Notebooks</h2>
				<button
					class="modal-close-button"
					onclick={handleClose}
					aria-label="Close search"
					data-testid="search-modal-close"
				>
					<X size={20} />
				</button>
			</div>

			<!-- Search Input -->
			<div class="search-input-container">
				<div class="search-input-wrapper">
					<SearchIcon size={16} class="search-icon" />
					<input
						bind:this={searchInput}
						type="text"
						placeholder="Search by title..."
						class="search-input"
						value={searchQuery}
						oninput={handleSearchInput}
						data-testid="search-input"
					/>
					{#if isLoading}
						<Loader2 size={16} class="search-loading animate-spin" />
					{/if}
				</div>

				<!-- Visibility Filter -->
				<select
					class="visibility-filter"
					value={visibility}
					onchange={handleVisibilityChange}
					data-testid="visibility-filter"
				>
					<option value="all">All Notebooks</option>
					<option value="public">Public Only</option>
					<option value="private">Private Only</option>
				</select>
			</div>

			<!-- Results -->
			<div class="search-results" data-testid="search-results">
				{#if error}
					<div class="search-error" data-testid="search-error">
						<p>{error}</p>
					</div>
				{:else if isLoading && searchQuery.trim()}
					<div class="search-loading-state" data-testid="search-loading">
						<div class="search-loading-state-icon">
							<Loader2 size={24} class="animate-spin" />
						</div>
						<p>Searching...</p>
					</div>
				{:else if !searchQuery.trim()}
					<div class="search-empty-state" data-testid="search-empty">
						<div class="search-empty-state-icon">
							<SearchIcon size={48} />
						</div>
						<p>Enter a search query to find notebooks</p>
					</div>
				{:else if results.length === 0}
					<div class="search-empty-state" data-testid="search-no-results">
						<div class="search-empty-state-icon">
							<FileText size={48} />
						</div>
						<p>No notebooks found</p>
						<p class="search-empty-hint">Try a different search term</p>
					</div>
				{:else}
					<div class="search-results-list" data-testid="search-results-list">
						{#each results as notebook, index (notebook.id)}
							<button
								type="button"
								class="search-result-item"
								class:selected={selectedIndex === index}
								onclick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									handleSelect(notebook.id);
								}}
								data-testid="search-result-item"
								data-notebook-id={notebook.id}
							>
								<div class="result-content">
									<div class="result-title">{notebook.title || 'Untitled Notebook'}</div>
									{#if notebook.description}
										<div class="result-description">{notebook.description}</div>
									{/if}
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		z-index: 1000;
		padding: var(--space-4);
		overflow-y: auto;
	}

	.modal-container {
		background-color: var(--color-white);
		border-radius: var(--border-radius-lg);
		box-shadow: var(--shadow-xl);
		width: 100%;
		max-width: 32rem;
		margin-top: var(--space-8);
		margin-bottom: var(--space-4);
		display: flex;
		flex-direction: column;
		max-height: calc(100vh - var(--space-8));
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4);
		border-bottom: var(--border-width) solid var(--color-gray-200);
	}

	.modal-title {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-gray-900);
		margin: 0;
	}

	.modal-close-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		background: transparent;
		border: none;
		border-radius: var(--border-radius);
		color: var(--color-gray-600);
		cursor: pointer;
		transition: background-color var(--transition-fast);
	}

	.modal-close-button:hover {
		background-color: var(--color-gray-100);
	}

	.search-input-container {
		padding: var(--space-4);
		border-bottom: var(--border-width) solid var(--color-gray-200);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.search-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-icon {
		position: absolute;
		left: var(--space-3);
		color: var(--color-gray-400);
		pointer-events: none;
	}

	.search-loading {
		position: absolute;
		right: var(--space-3);
		color: var(--color-gray-400);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: var(--space-3) var(--space-10);
		border: var(--border-width) solid var(--color-gray-300);
		border-radius: var(--border-radius);
		font-size: var(--font-size-base);
		color: var(--color-gray-900);
		background-color: var(--color-white);
	}

	.search-input:focus {
		outline: none;
		border-color: var(--color-blue-500);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.visibility-filter {
		padding: var(--space-2) var(--space-3);
		border: var(--border-width) solid var(--color-gray-300);
		border-radius: var(--border-radius);
		font-size: var(--font-size-sm);
		color: var(--color-gray-700);
		background-color: var(--color-white);
		cursor: pointer;
	}

	.visibility-filter:focus {
		outline: none;
		border-color: var(--color-blue-500);
	}

	.search-results {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-2);
		min-height: 200px;
		max-height: 400px;
	}

	.search-results-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding: 0;
		margin: 0;
	}

	.search-result-item {
		width: 100%;
		padding: var(--space-3);
		border-radius: var(--border-radius);
		cursor: pointer;
		transition: background-color var(--transition-fast);
		background: transparent;
		border: none;
		text-align: left;
	}

	.search-result-item:hover,
	.search-result-item.selected {
		background-color: var(--color-blue-50);
	}

	.result-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.result-title {
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-medium);
		color: var(--color-gray-900);
	}

	.result-description {
		font-size: var(--font-size-sm);
		color: var(--color-gray-600);
	}

	.search-empty-state,
	.search-loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-8);
		color: var(--color-gray-500);
		gap: var(--space-2);
	}

	.search-empty-state-icon svg,
	.search-loading-state-icon svg {
		color: var(--color-gray-400);
	}

	.search-empty-hint {
		font-size: var(--font-size-sm);
		color: var(--color-gray-400);
		margin-top: var(--space-1);
	}

	.search-error {
		padding: var(--space-4);
		background-color: var(--color-red-50);
		border: var(--border-width) solid var(--color-red-200);
		border-radius: var(--border-radius);
		color: var(--color-red-700);
		text-align: center;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.animate-spin {
		animation: spin 1s linear infinite;
	}
</style>
