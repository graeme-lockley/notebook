<script lang="ts">
	import { Plus } from 'lucide-svelte';

	interface Props {
		cellBeforeId?: string;
		cellAfterId?: string;
	}

	let { cellBeforeId, cellAfterId }: Props = $props();

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
			class="cursor-pointer hover:bg-gray-100 rounded transition-colors p-1"
			data-testid="add-cell-button"
			tabindex="0"
			role="button"
		>
			<Plus size={16} class="text-gray-400" />
		</div>
	</div>
	<div></div>
</div>
