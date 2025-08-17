<script lang="ts">
	import type { Cell } from '$lib/types/cell';

	interface Props {
		cell: Cell;
	}

	let { cell }: Props = $props();

	// Extract properties from cell
	let {
		status,
		valueHtml = null,
		isClosed = false
	} = $derived({
		status: cell.status,
		valueHtml: cell.valueHtml,
		isClosed: cell.isClosed
	});

	function sanitizeHtml(html: string): string {
		// Basic HTML sanitization - in production, use DOMPurify
		return html
			.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
			.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
			.replace(/javascript:/gi, '')
			.replace(/on\w+\s*=/gi, '');
	}
</script>

{#if status === 'ok' && valueHtml}
	<div>
		{@html sanitizeHtml(valueHtml)}
	</div>
{:else}
	<div>
		<p>No output</p>
	</div>
{/if}
