<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { AlertCircle, Loader2 } from 'lucide-svelte';

	let {
		id,
		status,
		valueHtml = null,
		error = null,
		console: consoleOutput = [],
		isClosed = false
	} = $props();

	const dispatch = createEventDispatcher<{
		retry: { id: string };
	}>();

	function sanitizeHtml(html: string): string {
		// Basic HTML sanitization - in production, use DOMPurify
		return html
			.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
			.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
			.replace(/javascript:/gi, '')
			.replace(/on\w+\s*=/gi, '');
	}

	function handleRetry() {
		dispatch('retry', { id });
	}

	// Don't render anything if no output and no error
	let hasOutput = $derived(valueHtml || error || consoleOutput.length > 0 || status === 'pending');
</script>

{#if hasOutput}
	<div
		data-testid="output-panel"
		class="space-y-2 p-4 {isClosed ? 'bg-white' : 'border-gray-200 bg-gray-50 border-t'}"
		role="region"
		aria-label="Cell output"
	>
		<!-- Pending State -->
		{#if status === 'pending'}
			<div
				data-testid="pending-indicator"
				class="animate-pulse space-x-2 text-gray-500 flex items-center"
			>
				<Loader2 size={16} class="animate-spin" />
				<span class="text-sm">Running...</span>
			</div>
		{/if}

		<!-- Error State -->
		{#if status === 'error' && error}
			<div data-testid="error-panel" class="rounded-md border-red-200 bg-red-50 p-3 border">
				<div class="space-x-2 flex items-start">
					<AlertCircle size={16} class="mt-0.5 text-red-500 flex-shrink-0" />
					<div class="flex-1">
						<pre
							data-testid="error-message"
							class="font-mono text-sm text-red-800 break-words whitespace-pre-wrap">
							{error}
						</pre>
						<button
							class="mt-2 text-sm text-red-600 hover:text-red-800 underline"
							onclick={handleRetry}
						>
							Retry
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Console Output -->
		{#if consoleOutput.length > 0}
			<div
				data-testid="console-output"
				class="max-h-32 rounded border-gray-200 bg-gray-900 p-3 font-mono text-sm text-gray-100 overflow-y-auto border"
			>
				{#each consoleOutput as message (message)}
					<div class="break-words whitespace-pre-wrap">{message}</div>
				{/each}
			</div>
		{/if}

		<!-- Value/DOM/Chart Output -->
		{#if status === 'ok' && valueHtml}
			<div
				data-testid="output-content"
				class="rounded {isClosed ? '' : 'border-gray-200 bg-white p-3 border'} {valueHtml.includes(
					'<div'
				) || valueHtml.includes('<svg')
					? 'overflow-auto'
					: ''}"
			>
				<!-- Note: HTML is sanitized using sanitizeHtml() function to prevent XSS attacks.
				     This removes script tags, iframe tags, javascript: URLs, and event handlers.
				     In production, consider using DOMPurify for more comprehensive sanitization. -->
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html sanitizeHtml(valueHtml)}
			</div>
		{/if}
	</div>
{/if}
