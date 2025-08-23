<script lang="ts">
	import { Braces, Code, Text } from 'lucide-svelte';
	import type { CellKind } from '$lib/types/cell';

	interface Props {
		isFocused: boolean;
		kind: CellKind;
	}

	let { isFocused, kind }: Props = $props();

	let hover = $state(false);

	// Determine icon color based on focus and hover state
	let iconColor = $derived(hover ? 'text-gray-600' : 'text-gray-400');
	let backgroundColor = $derived(isFocused ? 'bg-gray-100' : '');
</script>

<div
	class="flex justify-center {backgroundColor} pt-1"
	role="button"
	tabindex="0"
	onmouseover={() => (hover = true)}
	onmouseleave={() => (hover = false)}
	onfocus={() => (hover = true)}
	onblur={() => (hover = false)}
>
	{#if kind === 'js'}
		<Braces size={16} class={iconColor} />
	{:else if kind === 'md'}
		<Text size={16} class={iconColor} />
	{:else if kind === 'html'}
		<Code size={16} class={iconColor} />
	{/if}
</div>
