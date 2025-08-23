<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import RenderedToggleGutter from './RenderedToggleGutter.svelte';
	import RenderedPopupGutter from './RenderedPopupGutter.svelte';
	import RenderedContent from './RenderedContent.svelte';

	import type { Cell } from '$lib/types/cell';
	import type { ToggleSourceViewEvent } from './event-types';

	interface Props {
		isClosed: boolean;
		isFocused: boolean;
		cell: Cell;
	}

	let { isClosed, isFocused, cell }: Props = $props();

	const dispatch = createEventDispatcher<{
		ToggleSourceView: ToggleSourceViewEvent;
	}>();

	function handleToggleSourceView(event: CustomEvent<ToggleSourceViewEvent>) {
		dispatch('ToggleSourceView', event.detail);
	}
</script>

<RenderedToggleGutter
	{isClosed}
	{isFocused}
	cellId={cell.id}
	on:ToggleSourceView={handleToggleSourceView}
/>
<RenderedPopupGutter {isFocused} />
<RenderedContent {cell} />
