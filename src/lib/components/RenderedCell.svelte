<script lang="ts">
	import RenderedToggleGutter from './RenderedToggleGutter.svelte';
	import RenderedPopupGutter from './RenderedPopupGutter.svelte';
	import RenderedContent from './RenderedContent.svelte';

	import type { Cell } from '$lib/types/cell';

	interface Props {
		cell: Cell;
	}

	let { cell }: Props = $props();
</script>

<RenderedToggleGutter {cell} />
<RenderedPopupGutter {cell} />
<RenderedContent {cell} />
