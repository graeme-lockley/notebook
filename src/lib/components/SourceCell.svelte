<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Cell } from '$lib/types/cell';
	import SourceContent from './SourceContent.svelte';
	import SourcePopupGutter from './SourcePopupGutter.svelte';
	import type { SourceValueChangeEvent } from './event-types';

	interface Props {
		isFocused: boolean;
		cell: Cell;
	}

	let { isFocused, cell }: Props = $props();

	const dispatch = createEventDispatcher<{
		SourceValueChange: SourceValueChangeEvent;
	}>();

	function handleSourceValueChange(event: CustomEvent<SourceValueChangeEvent>) {
		dispatch('SourceValueChange', event.detail);
	}
</script>

<div></div>
<SourcePopupGutter {isFocused} kind={cell.kind} />
<SourceContent
	id={cell.id}
	kind={cell.kind}
	value={cell.value}
	isFocused={cell.isFocused}
	placeholder=""
	on:SourceValueChange={handleSourceValueChange}
/>
