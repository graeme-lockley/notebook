<script lang="ts">
	import type { Cell } from '$lib/types/cell';
	import SourceContent from './SourceContent.svelte';
	import SourcePopupGutter from './SourcePopupGutter.svelte';

	interface Props {
		isFocused: boolean;
		cell: Cell;
	}

	let { isFocused, cell }: Props = $props();
</script>

<div></div>
<SourcePopupGutter {isFocused} kind={cell.kind} />
<SourceContent
	id={cell.id}
	kind={cell.kind}
	value={cell.value}
	isFocused={cell.isFocused}
	placeholder=""
/>
