<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import RenderedToggleGutter from './RenderedToggleGutter.svelte';
	import RenderedPopupGutter from './RenderedPopupGutter.svelte';
	import RenderedContent from './RenderedContent.svelte';

	import type { Cell } from '$lib/types/cell';
	import type {
		ToggleSourceViewEvent,
		DeleteCellEvent,
		MoveCellUpEvent,
		MoveCellDownEvent,
		DuplicateCellEvent
	} from './event-types';

	interface Props {
		isClosed: boolean;
		isFocused: boolean;
		cell: Cell;
	}

	let { isClosed, isFocused, cell }: Props = $props();

	const dispatch = createEventDispatcher<{
		ToggleSourceView: ToggleSourceViewEvent;
		DeleteCell: DeleteCellEvent;
		MoveCellUp: MoveCellUpEvent;
		MoveCellDown: MoveCellDownEvent;
		DuplicateCell: DuplicateCellEvent;
	}>();

	function handleDeleteCell(event: CustomEvent<DeleteCellEvent>) {
		dispatch('DeleteCell', event.detail);
	}

	function handleDuplicateCell(event: CustomEvent<DuplicateCellEvent>) {
		dispatch('DuplicateCell', event.detail);
	}

	function handleMoveCellDown(event: CustomEvent<MoveCellDownEvent>) {
		dispatch('MoveCellDown', event.detail);
	}

	function handleMoveCellUp(event: CustomEvent<MoveCellUpEvent>) {
		dispatch('MoveCellUp', event.detail);
	}

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
<RenderedPopupGutter
	id={cell.id}
	{isFocused}
	on:DeleteCell={handleDeleteCell}
	on:MoveCellUp={handleMoveCellUp}
	on:MoveCellDown={handleMoveCellDown}
	on:DuplicateCell={handleDuplicateCell}
/>
<RenderedContent {cell} />
