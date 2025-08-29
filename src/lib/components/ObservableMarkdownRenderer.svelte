<script lang="ts">
	import { marked } from 'marked';

	let { value } = $props<{
		value: unknown;
	}>();

	let renderedContent = $state('');
	let hasError = $state(false);
	let errorMessage = $state('');

	$effect(() => {
		renderValue();
	});

	// Render different types of values
	async function renderValue() {
		hasError = false;
		errorMessage = '';

		try {
			const content = typeof value === 'string' ? value : String(value);
			renderedContent = await marked.parse(content);
		} catch (error) {
			console.error('Error in renderValue:', error);
			hasError = true;
			errorMessage = error instanceof Error ? error.message : String(error);
		}
	}
</script>

{#if hasError}
	<div class="render-error">
		<div class="error-icon">⚠️</div>
		<div class="error-message">
			<strong>Render Error:</strong>
			{errorMessage}
		</div>
	</div>
{:else}
	<div class="markdown-content">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html renderedContent}
	</div>
{/if}
