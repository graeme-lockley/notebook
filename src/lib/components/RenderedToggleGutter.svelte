<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { ChevronRight, ChevronDown } from 'lucide-svelte';
	import type { ToggleSourceViewEvent } from './event-types';

	interface Props {
		isClosed: boolean;
		cellId: string;
		isFocused: boolean;
	}

	let { isClosed, cellId, isFocused }: Props = $props();

	let hover = $state(false);

	const dispatch = createEventDispatcher<{
		ToggleSourceView: ToggleSourceViewEvent;
	}>();

	let iconColor = $derived(hover ? 'text-black' : isFocused ? 'text-gray-400' : 'text-gray-400');

	function toggleIsClosed() {
		dispatch('ToggleSourceView', { cellId });
	}
</script>

{#if isFocused}
	<div
		class="flex justify-center pt-1"
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
