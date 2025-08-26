<script lang="ts">
	import { EllipsisVertical } from 'lucide-svelte';

	interface Props {
		isFocused: boolean;
	}

	let { isFocused }: Props = $props();
</script>

{#if isFocused}
	<div class="flex justify-center bg-gray-100 pt-1" role="button" tabindex="0">
		<EllipsisVertical size={16} class="text-gray-400 hover:text-gray-600" />
	</div>
{:else}
	<div></div>
{/if}
