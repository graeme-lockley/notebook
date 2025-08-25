<script lang="ts">
	import { Plus } from 'lucide-svelte';

	interface Props {
		cellBeforeId?: string;
		cellAfterId?: string;
		focusedCellId: string | undefined;
	}

	let { cellBeforeId, cellAfterId, focusedCellId }: Props = $props();

	let isFocused = $derived(cellAfterId === focusedCellId || cellBeforeId === focusedCellId);

	function handleClick() {
		console.log('AddCellBetween clicked:');
		console.log('  Cell before:', cellBeforeId || 'none');
		console.log('  Cell after:', cellAfterId || 'none');
	}
</script>

<div class="notebook-editor-row">
	<div></div>
	<div class="flex items-center justify-center">
		<div
			onclick={handleClick}
			onkeydown={(e) => e.key === 'Enter' && handleClick()}
			class="cursor-pointer hover:bg-gray-100 hover:text-gray-600 rounded transition-colors p-1 {!isFocused
				? 'text-white'
				: 'text-gray-400'}"
			data-testid="add-cell-button"
			tabindex="0"
			role="button"
		>
			<Plus size={16} />
		</div>
	</div>
	<div></div>
</div>
