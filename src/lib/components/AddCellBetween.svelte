<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Plus, Code, FileText, Code2 } from 'lucide-svelte';

	let { position = 'between', cellId = '' } = $props();

	const dispatch = createEventDispatcher<{
		addCell: { position: string; cellId: string };
		selectType: { type: 'js' | 'md' | 'html'; position: string; cellId: string };
	}>();

	let isMenuOpen = $state(false);

	const cellTypes = [
		{ type: 'js' as const, icon: Code, label: 'JavaScript', color: 'text-yellow-600' },
		{ type: 'md' as const, icon: FileText, label: 'Markdown', color: 'text-blue-600' },
		{ type: 'html' as const, icon: Code2, label: 'HTML', color: 'text-green-600' }
	];

	function handleAddClick() {
		dispatch('addCell', { position, cellId });
	}

	function handleTypeSelect(type: 'js' | 'md' | 'html') {
		dispatch('selectType', { type, position, cellId });
		isMenuOpen = false;
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleAddClick();
		}
	}

	function handleMenuKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			isMenuOpen = false;
		}
	}
</script>

<div class="relative">
	<!-- Add Cell Button -->
	<button
		data-testid="add-cell-button"
		class="group flex h-8 w-full items-center justify-center border-t border-gray-100 bg-white text-gray-400 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-600"
		onclick={handleAddClick}
		onkeydown={handleKeyDown}
		aria-label="Add cell"
		title="Add cell"
	>
		<Plus size={16} />
	</button>

	<!-- Type Selection Menu -->
	{#if isMenuOpen}
		<div
			data-testid="type-menu"
			class="absolute top-0 left-1/2 z-50 -translate-x-1/2 transform rounded-md border border-gray-200 bg-white p-2 shadow-lg"
			role="menu"
			aria-label="Select cell type"
			tabindex="-1"
			onkeydown={handleMenuKeyDown}
		>
			{#each cellTypes as cellType (cellType.type)}
				<button
					data-testid="type-option-{cellType.type}"
					class="flex w-full items-center space-x-2 rounded px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-gray-100"
					onclick={() => handleTypeSelect(cellType.type)}
					role="menuitem"
					aria-label="Add {cellType.label} cell"
				>
					<cellType.icon size={16} class={cellType.color} />
					<span>{cellType.label}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
