<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Globe, Copy, Download } from 'lucide-svelte';

	let { title = 'Untitled Notebook', lastEdited = new Date(), version = '1.0.0' } = $props();

	const dispatch = createEventDispatcher<{
		titleChange: string;
		share: void;
		duplicate: void;
		download: void;
	}>();

	let isEditingTitle = $state(false);
	let titleValue = $state(title);

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

<header
	data-testid="topbar"
	class="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3"
>
	<!-- Title and Metadata Area -->
	<div class="flex items-center space-x-4">
		<!-- Editable Title -->
		<div class="flex items-center">
			{#if isEditingTitle}
				<input
					type="text"
					bind:value={titleValue}
					onblur={handleTitleBlur}
					onkeydown={handleTitleKeydown}
					class="focus:ring-opacity-50 rounded border-none bg-transparent px-2 py-1 text-xl font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
					data-testid="title-input"
				/>
			{:else}
				<button
					onclick={handleTitleClick}
					class="rounded px-2 py-1 text-xl font-semibold text-gray-900 transition-colors duration-150 hover:bg-gray-100"
					data-testid="title-button"
				>
					{titleValue}
				</button>
			{/if}
		</div>

		<!-- Metadata -->
		<div class="flex items-center space-x-3 text-sm text-gray-500">
			<span data-testid="last-edited">
				Last edited {formatDate(lastEdited)}
			</span>
			<span class="text-gray-300">•</span>
			<span data-testid="version">v{version}</span>
		</div>
	</div>

	<!-- Actions Area -->
	<div class="flex items-center space-x-1">
		<button
			onclick={handleShare}
			data-testid="share-button"
			class="flex items-center space-x-1.5 rounded border border-gray-300 px-2.5 py-1.5 text-sm text-gray-700 transition-colors duration-150 hover:bg-gray-100"
			title="Share notebook"
		>
			<Globe size={14} />
			<span>Share...</span>
		</button>

		<button
			onclick={handleDuplicate}
			data-testid="duplicate-button"
			class="flex h-8 w-8 items-center justify-center rounded border border-gray-300 text-gray-700 transition-colors duration-150 hover:bg-gray-100"
			title="Duplicate notebook"
		>
			<Copy size={14} />
		</button>

		<button
			onclick={handleDownload}
			data-testid="download-button"
			class="flex h-8 w-8 items-center justify-center rounded border border-gray-300 text-gray-700 transition-colors duration-150 hover:bg-gray-100"
			title="Download notebook"
		>
			<Download size={14} />
		</button>
	</div>
</header>
