<script lang="ts">
	import { EllipsisVertical } from 'lucide-svelte';

	interface Props {
		isFocused: boolean;
	}

	let { isFocused }: Props = $props();

	let hover = $state(false);

	// Determine icon color based on focus and hover state
	let iconColor = $derived(hover ? 'text-gray-600' : 'text-gray-400');
</script>

{#if isFocused}
	<div
		class="flex justify-center bg-gray-100 pt-1"
		role="button"
		tabindex="0"
		onmouseover={() => (hover = true)}
		onmouseleave={() => (hover = false)}
		onfocus={() => (hover = true)}
		onblur={() => (hover = false)}
	>
		<EllipsisVertical size={16} class={iconColor} />
	</div>
{:else}
	<div></div>
{/if}
