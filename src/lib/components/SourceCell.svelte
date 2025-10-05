<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Cell } from '$lib/client/model/cell';
	import SourceContent from './SourceContent.svelte';
	import SourcePopupGutter from './SourcePopupGutter.svelte';
	import type { SourceValueChangeEvent, SourceKindChangeEvent } from './event-types';

	interface Props {
		isFocused: boolean;
		cell: Cell;
	}

	let { isFocused, cell }: Props = $props();

	const dispatch = createEventDispatcher<{
		SourceKindChange: SourceKindChangeEvent;
		SourceValueChange: SourceValueChangeEvent;
	}>();

	function handleSourceValueChange(event: CustomEvent<SourceValueChangeEvent>) {
		dispatch('SourceValueChange', event.detail);
	}

	function handleSourceKindChange(event: CustomEvent<SourceKindChangeEvent>) {
		dispatch('SourceKindChange', event.detail);
	}
</script>

<div></div>
<SourcePopupGutter
	id={cell.id}
	{isFocused}
	kind={cell.kind}
	on:SourceKindChange={handleSourceKindChange}
/>
<SourceContent
	id={cell.id}
	kind={cell.kind}
	value={cell.value}
	isFocused={cell.isFocused}
	placeholder=""
	on:SourceValueChange={handleSourceValueChange}
/>
