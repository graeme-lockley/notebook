<script lang="ts">
	import type { Cell } from '$lib/types/cell';

	interface Props {
		cell: Cell;
	}

	let { cell }: Props = $props();
</script>

<div class="source-cell">
	<pre class="font-mono text-sm p-3 bg-gray-50 rounded border">{cell.value}</pre>
</div>
