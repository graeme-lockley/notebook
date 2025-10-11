<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { goto } from '$app/navigation';
	import { Globe, Copy, Download, Search, Plus, Pencil } from 'lucide-svelte';
	import CreateNotebookModal from './CreateNotebookModal.svelte';
	import EditNotebookModal from './EditNotebookModal.svelte';
	import type { CreateNotebookEvent, UpdateNotebookEvent } from './event-types';
	import { logger } from '$lib/common/infrastructure/logging/logger.service';
	import * as ServerCommand from '$lib/client/server/server-commands';

	let {
		title = 'Untitled Notebook',
		description = '',
		lastEdited = new Date(),
		version = '1.0.0'
	} = $props();

	// Track current values for display
	let currentTitle = $state(title);
	let currentDescription = $state(description);

	// Update when props change
	$effect(() => {
		currentTitle = title;
		currentDescription = description;
	});

	const dispatch = createEventDispatcher<{
		search: void;
		newNotebook: { name: string; description: string };
		updateNotebook: UpdateNotebookEvent;
		share: void;
		duplicate: void;
		download: void;
	}>();

	let showNewNotebookModal = $state(false);
	let showEditNotebookModal = $state(false);

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
			const result = await ServerCommand.createNotebook(
				event.detail.name,
				event.detail.description
			);

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

	function handleEditNotebook() {
		showEditNotebookModal = true;
	}

	function handleUpdateNotebook(event: CustomEvent<UpdateNotebookEvent>) {
		dispatch('updateNotebook', event.detail);
	}

	function handleCancelEditNotebook() {
		showEditNotebookModal = false;
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
		<!-- Title -->
		<div class="title-container">
			<h1 class="title-text" data-testid="notebook-title">
				{currentTitle}
			</h1>
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
			onclick={handleEditNotebook}
			class="action-button action-button-icon"
			data-testid="edit-notebook-button"
			title="Edit notebook"
		>
			<Pencil size={14} />
		</button>

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

<!-- Edit Notebook Modal -->
<EditNotebookModal
	isOpen={showEditNotebookModal}
	{currentTitle}
	{currentDescription}
	on:updateNotebook={handleUpdateNotebook}
	on:cancel={handleCancelEditNotebook}
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

	.title-text {
		margin: 0;
		padding: var(--space-2) var(--space-4);
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-semibold);
		color: var(--color-gray-900);
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
