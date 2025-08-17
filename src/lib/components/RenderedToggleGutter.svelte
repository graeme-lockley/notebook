<script lang="ts">
	import { ChevronRight, ChevronDown } from 'lucide-svelte';
	import type { Cell } from '$lib/types/cell';

	interface Props {
		cell: Cell;
	}

	let { cell }: Props = $props();

	// Determine if we should show the toggle icon
	let shouldShowIcon = $derived(cell.isFocused);

	// Determine icon color based on focus state
	let iconColor = $derived(cell.isFocused ? 'text-gray-600' : 'text-gray-400');
</script>

<div>
	{#if shouldShowIcon}
		{#if cell.isClosed}
			<ChevronRight size={16} class={iconColor} />
		{:else}
			<ChevronDown size={16} class={iconColor} />
		{/if}
	{/if}
</div>
