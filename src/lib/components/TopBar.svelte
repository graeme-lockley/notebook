<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { goto } from '$app/navigation';
	import { Globe, Copy, Download, Search, Plus } from 'lucide-svelte';
	import CreateNotebookModal from './CreateNotebookModal.svelte';
	import type { CreateNotebookEvent } from './event-types';
	import { logger } from '$lib/common/infrastructure/logging/logger.service';

	let { title = 'Untitled Notebook', lastEdited = new Date(), version = '1.0.0' } = $props();

	const dispatch = createEventDispatcher<{
		titleChange: string;
		search: void;
		newNotebook: { name: string; description: string };
		share: void;
		duplicate: void;
		download: void;
	}>();

	let isEditingTitle = $state(false);
	let titleValue = $state(title);
	let showNewNotebookModal = $state(false);

	function handleTitleClick() {
		isEditingTitle = true;
	}

	function handleTitleBlur() {
		isEditingTitle = false;
		if (titleValue !== title) {
			dispatch('titleChange', titleValue);
		}
	}

	function handleTitleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			(event.target as HTMLInputElement).blur();
		} else if (event.key === 'Escape') {
			titleValue = title;
			isEditingTitle = false;
		}
	}

	function formatDate(date: Date): string {
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function handleSearch() {
		dispatch('search');
	}

	function handleNewNotebook() {
		showNewNotebookModal = true;
	}

	async function handleCreateNotebook(event: CustomEvent<CreateNotebookEvent>) {
		try {
			const { name, description } = event.detail;

			// Call the API to create the notebook
			const response = await fetch('/api/notebooks', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					title: name,
					description: description || ''
				})
			});

			if (!response.ok) {
				throw new Error(`Failed to create notebook: ${response.statusText}`);
			}

			const result = await response.json();

			// Navigate to a clean page with the new notebook
			await goto(`/notebook/${result.id}`);
		} catch (error) {
			logger.error('Error creating notebook:', error);
			// You might want to show an error message to the user here
		}
	}

	function handleCancelNotebook() {
		showNewNotebookModal = false;
	}

	function handleShare() {
		dispatch('share');
	}

	function handleDuplicate() {
		dispatch('duplicate');
	}

	function handleDownload() {
		dispatch('download');
	}
</script>

<header data-testid="topbar" class="topbar">
	<!-- Title and Metadata Area -->
	<div class="topbar-left">
		<!-- Editable Title -->
		<div class="title-container">
			{#if isEditingTitle}
				<input
					type="text"
					bind:value={titleValue}
					onblur={handleTitleBlur}
					onkeydown={handleTitleKeydown}
					class="title-input"
					data-testid="title-input"
				/>
			{:else}
				<button onclick={handleTitleClick} class="title-button" data-testid="title-button">
					{titleValue}
				</button>
			{/if}
		</div>

		<!-- Metadata -->
		<div class="metadata">
			<span data-testid="last-edited">
				Last edited {formatDate(lastEdited)}
			</span>
			<span class="separator">•</span>
			<span data-testid="version">v{version}</span>
		</div>
	</div>

	<!-- Actions Area -->
	<div class="topbar-actions">
		<button
			onclick={handleSearch}
			data-testid="search-button"
			class="action-button action-button-icon"
			title="Search notebooks"
		>
			<Search size={14} />
		</button>

		<button
			onclick={handleNewNotebook}
			data-testid="new-notebook-button"
			class="action-button action-button-icon"
			title="Create new notebook"
		>
			<Plus size={14} />
		</button>

		<button
			onclick={handleShare}
			data-testid="share-button"
			class="action-button action-button-text"
			title="Share notebook"
		>
			<Globe size={14} />
			<span>Share...</span>
		</button>

		<button
			onclick={handleDuplicate}
			data-testid="duplicate-button"
			class="action-button action-button-icon"
			title="Duplicate notebook"
		>
			<Copy size={14} />
		</button>

		<button
			onclick={handleDownload}
			data-testid="download-button"
			class="action-button action-button-icon"
			title="Download notebook"
		>
			<Download size={14} />
		</button>
	</div>
</header>

<!-- New Notebook Modal -->
<CreateNotebookModal
	isOpen={showNewNotebookModal}
	on:createNotebook={handleCreateNotebook}
	on:cancel={handleCancelNotebook}
/>

<style>
	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: var(--border-width) solid var(--color-gray-200);
		background-color: var(--color-white);
		padding: var(--space-3) var(--space-6);
	}

	.topbar-left {
		display: flex;
		align-items: center;
		gap: var(--space-4);
	}

	.title-container {
		display: flex;
		align-items: center;
	}

	.title-button {
		border-radius: var(--border-radius);
		padding: var(--space-2) var(--space-4);
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-semibold);
		color: var(--color-gray-900);
		background: transparent;
		border: none;
		cursor: pointer;
		transition: background-color var(--transition-fast);
	}

	.title-button:hover {
		background-color: var(--color-gray-100);
	}

	.title-input {
		border: none;
		background: transparent;
		padding: var(--space-2) var(--space-4);
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-semibold);
		color: var(--color-gray-900);
		outline: none;
		border-radius: var(--border-radius);
	}

	.title-input:focus {
		box-shadow: 0 0 0 2px var(--color-primary);
	}

	.metadata {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		font-size: var(--font-size-sm);
		color: var(--color-gray-500);
	}

	.separator {
		color: var(--color-gray-300);
	}

	.topbar-actions {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.action-button {
		display: flex;
		align-items: center;
		justify-content: center;
		border: var(--border-width) solid var(--color-gray-300);
		border-radius: var(--border-radius);
		color: var(--color-gray-700);
		background: transparent;
		cursor: pointer;
		transition: background-color var(--transition-fast);
	}

	.action-button:hover {
		background-color: var(--color-gray-100);
	}

	.action-button-text {
		gap: var(--space-1);
		padding: var(--space-1) var(--space-2);
		font-size: var(--font-size-sm);
	}

	.action-button-icon {
		width: 2rem;
		height: 2rem;
	}
</style>
