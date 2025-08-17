<script lang="ts">
	import { ChevronRight, ChevronDown } from 'lucide-svelte';
	import type { Cell } from '$lib/types/cell';

	interface Props {
		cell: Cell;
	}

	let { cell }: Props = $props();

	let shouldShowIcon = $derived(cell.isFocused);

	let isClosed = $state(cell.isClosed);

	let hover = $state(false);

	let iconColor = $derived(
		hover ? 'text-black' : cell.isFocused ? 'text-gray-400' : 'text-gray-400'
	);

	function toggleIsClosed() {
		isClosed = !isClosed;
		cell.isClosed = isClosed;
	}
</script>

{#if shouldShowIcon}
	<div
		class="flex justify-center"
		role="button"
		tabindex="0"
		onclick={() => toggleIsClosed()}
		onkeydown={(e) => {
			if (e.key === ' ') {
				toggleIsClosed();
			}
		}}
		onmouseover={() => (hover = true)}
		onmouseleave={() => (hover = false)}
		onfocus={() => (hover = true)}
		onblur={() => (hover = false)}
	>
		{#if isClosed}
			<ChevronRight size={16} class={iconColor} />
		{:else}
			<ChevronDown size={16} class={iconColor} />
		{/if}
	</div>
{:else}
	<div></div>
{/if}
