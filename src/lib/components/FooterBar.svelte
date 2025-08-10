<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Plus, Play, Settings, Eye } from 'lucide-svelte';

	const dispatch = createEventDispatcher<{
		addCell: { type: 'javascript' | 'markdown' | 'html' };
		runAll: void;
		toggleSettings: void;
		changeViewMode: 'edit' | 'preview' | 'presentation';
	}>();

	let showTypeSelector = $state(false);
	let currentViewMode = $state<'edit' | 'preview' | 'presentation'>('edit');

	function handleAddCell() {
		showTypeSelector = !showTypeSelector;
	}

	function handleCellTypeSelect(type: 'javascript' | 'markdown' | 'html') {
		dispatch('addCell', { type });
		showTypeSelector = false;
	}

	function handleRunAll() {
		dispatch('runAll');
	}

	function handleToggleSettings() {
		dispatch('toggleSettings');
	}

	function handleViewModeChange(mode: 'edit' | 'preview' | 'presentation') {
		currentViewMode = mode;
		dispatch('changeViewMode', mode);
	}
</script>

<footer
	data-testid="footerbar"
	class="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-3"
>
	<!-- Left side - Cell Management -->
	<div class="flex items-center space-x-1">
		<!-- Add Cell Button with Type Selector -->
		<div class="relative">
			<button
				onclick={handleAddCell}
				data-testid="add-cell-button"
				class="flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-700 transition-colors duration-150 hover:bg-gray-50"
				title="Add new cell"
			>
				<Plus size={14} />
			</button>

			{#if showTypeSelector}
				<div
					class="absolute top-full left-0 mt-2 min-w-[120px] rounded-md border border-gray-200 bg-white p-2 shadow-lg"
				>
					<button
						onclick={() => handleCellTypeSelect('javascript')}
						class="w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-100"
					>
						JavaScript
					</button>
					<button
						onclick={() => handleCellTypeSelect('markdown')}
						class="w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-100"
					>
						Markdown
					</button>
					<button
						onclick={() => handleCellTypeSelect('html')}
						class="w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-100"
					>
						HTML
					</button>
				</div>
			{/if}
		</div>

		<!-- Run All Button -->
		<button
			onclick={handleRunAll}
			data-testid="run-all-button"
			class="flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-700 transition-colors duration-150 hover:bg-gray-50"
			title="Run all cells"
		>
			<Play size={14} />
		</button>
	</div>

	<!-- Right side - Settings and View Options -->
	<div class="flex items-center space-x-1">
		<!-- Settings Button -->
		<button
			onclick={handleToggleSettings}
			data-testid="settings-button"
			class="flex h-8 w-8 items-center justify-center rounded border border-gray-300 text-gray-700 transition-colors duration-150 hover:bg-gray-100"
			title="Settings"
		>
			<Settings size={14} />
		</button>

		<!-- View Mode Switcher -->
		<div class="flex items-center space-x-0.5 rounded border border-gray-300 bg-white p-0.5">
			<button
				onclick={() => handleViewModeChange('edit')}
				data-testid="view-mode-switcher"
				class="rounded px-2 py-1 text-xs {currentViewMode === 'edit'
					? 'bg-gray-100 text-gray-900'
					: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
				title="Edit mode"
			>
				Edit
			</button>
			<button
				onclick={() => handleViewModeChange('preview')}
				class="rounded px-2 py-1 text-xs {currentViewMode === 'preview'
					? 'bg-gray-100 text-gray-900'
					: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
				title="Preview mode"
			>
				Preview
			</button>
			<button
				onclick={() => handleViewModeChange('presentation')}
				class="rounded px-2 py-1 text-xs {currentViewMode === 'presentation'
					? 'bg-gray-100 text-gray-900'
					: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
				title="Presentation mode"
			>
				<Eye size={12} />
			</button>
		</div>
	</div>
</footer>
