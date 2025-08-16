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

<footer data-testid="footerbar" class="footerbar">
	<!-- Left side - Cell Management -->
	<div class="footerbar-left">
		<!-- Add Cell Button with Type Selector -->
		<div class="type-selector-container">
			<button
				onclick={handleAddCell}
				data-testid="add-cell-button"
				class="footer-button"
				title="Add new cell"
			>
				<Plus size={14} />
			</button>

			{#if showTypeSelector}
				<div class="type-selector">
					<button
						onclick={() => handleCellTypeSelect('javascript')}
						class="type-option"
					>
						JavaScript
					</button>
					<button
						onclick={() => handleCellTypeSelect('markdown')}
						class="type-option"
					>
						Markdown
					</button>
					<button
						onclick={() => handleCellTypeSelect('html')}
						class="type-option"
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
			class="footer-button"
			title="Run all cells"
		>
			<Play size={14} />
		</button>
	</div>

	<!-- Right side - Settings and View Options -->
	<div class="footerbar-right">
		<!-- Settings Button -->
		<button
			onclick={handleToggleSettings}
			data-testid="settings-button"
			class="footer-button"
			title="Settings"
		>
			<Settings size={14} />
		</button>

		<!-- View Mode Switcher -->
		<div class="view-mode-switcher">
			<button
				onclick={() => handleViewModeChange('edit')}
				data-testid="view-mode-switcher"
				class="view-mode-button {currentViewMode === 'edit' ? 'active' : ''}"
				title="Edit mode"
			>
				Edit
			</button>
			<button
				onclick={() => handleViewModeChange('preview')}
				class="view-mode-button {currentViewMode === 'preview' ? 'active' : ''}"
				title="Preview mode"
			>
				Preview
			</button>
			<button
				onclick={() => handleViewModeChange('presentation')}
				class="view-mode-button {currentViewMode === 'presentation' ? 'active' : ''}"
				title="Presentation mode"
			>
				<Eye size={12} />
			</button>
		</div>
	</div>
</footer>

<style>
	.footerbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-top: var(--border-width) solid var(--color-gray-200);
		background-color: var(--color-white);
		padding: var(--space-3) var(--space-6);
	}

	.footerbar-left {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.footerbar-right {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.footer-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border: var(--border-width) solid var(--color-gray-300);
		border-radius: var(--border-radius);
		background-color: var(--color-white);
		color: var(--color-gray-700);
		cursor: pointer;
		transition: background-color var(--transition-fast);
	}

	.footer-button:hover {
		background-color: var(--color-gray-50);
	}

	.type-selector-container {
		position: relative;
	}

	.type-selector {
		position: absolute;
		top: 100%;
		left: 0;
		margin-top: var(--space-2);
		min-width: 120px;
		border: var(--border-width) solid var(--color-gray-200);
		border-radius: var(--border-radius-md);
		background-color: var(--color-white);
		padding: var(--space-2);
		box-shadow: var(--shadow-lg);
		z-index: 10;
	}

	.type-option {
		width: 100%;
		padding: var(--space-2) var(--space-3);
		text-align: left;
		font-size: var(--font-size-sm);
		background: transparent;
		border: none;
		border-radius: var(--border-radius);
		cursor: pointer;
		transition: background-color var(--transition-fast);
	}

	.type-option:hover {
		background-color: var(--color-gray-100);
	}

	.view-mode-switcher {
		display: flex;
		align-items: center;
		gap: 0;
		border: var(--border-width) solid var(--color-gray-300);
		border-radius: var(--border-radius);
		background-color: var(--color-white);
		padding: var(--space-1);
	}

	.view-mode-button {
		padding: var(--space-1) var(--space-2);
		font-size: var(--font-size-xs);
		background: transparent;
		border: none;
		border-radius: var(--border-radius);
		color: var(--color-gray-600);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.view-mode-button:hover {
		background-color: var(--color-gray-50);
		color: var(--color-gray-900);
	}

	.view-mode-button.active {
		background-color: var(--color-gray-100);
		color: var(--color-gray-900);
	}
</style>
