<script lang="ts">
	let { value } = $props<{
		value: unknown;
	}>();

	let renderedContent = $state('');
	let hasError = $state(false);
	let errorMessage = $state('');

	$effect(() => {
		renderValue();
	});

	async function renderValue() {
		hasError = false;
		errorMessage = '';

		try {
			if (typeof value === 'string') {
				renderedContent = value;
			} else {
				renderedContent = String(value);
			}
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
	<div class="html-content">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html renderedContent}
	</div>
{/if}
