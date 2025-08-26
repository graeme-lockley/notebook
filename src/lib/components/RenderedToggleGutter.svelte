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

	const dispatch = createEventDispatcher<{
		ToggleSourceView: ToggleSourceViewEvent;
	}>();

	function toggleIsClosed() {
		dispatch('ToggleSourceView', { cellId });
	}
</script>

{#if isFocused}
	<div
		class="flex justify-center pt-1 text-gray-400 hover:text-gray-600"
		role="button"
		tabindex="0"
		onclick={() => toggleIsClosed()}
		onkeydown={(e) => {
			if (e.key === ' ') {
				toggleIsClosed();
			}
		}}
	>
		{#if isClosed}
			<ChevronRight size={16} />
		{:else}
			<ChevronDown size={16} />
		{/if}
	</div>
{:else}
	<div></div>
{/if}
