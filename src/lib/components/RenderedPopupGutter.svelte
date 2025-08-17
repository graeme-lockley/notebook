<script lang="ts">
	import { MoreVertical } from 'lucide-svelte';
	import type { Cell } from '$lib/types/cell';

	interface Props {
		cell: Cell;
	}

	let { cell }: Props = $props();

	// Determine if we should show the popup icon
	let shouldShowIcon = $derived(cell.isFocused);

	// Determine icon color based on focus state
	let iconColor = $derived(cell.isFocused ? 'text-gray-600' : 'text-gray-400');
</script>

<div>
	{#if shouldShowIcon}
		<MoreVertical size={16} class={iconColor} data-testid="popup-icon" />
	{/if}
</div>
