<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { text, number, range, select, checkbox, radio, textarea } from '@observablehq/inputs';

	const dispatch = createEventDispatcher<{
		change: { value: unknown; type: string };
		input: { value: unknown; type: string };
	}>();

	let {
		type = 'text',
		value = '',
		options = {},
		label = '',
		placeholder = '',
		min,
		max,
		step,
		disabled = false,
		className = ''
	} = $props<{
		type: 'text' | 'number' | 'range' | 'select' | 'checkbox' | 'radio' | 'textarea';
		value?: unknown;
		options?: Record<string, unknown>;
		label?: string;
		placeholder?: string;
		min?: number;
		max?: number;
		step?: number;
		disabled?: boolean;
		className?: string;
	}>();

	let container: HTMLElement;
	let inputElement: HTMLElement | null = null;

	// Create input element based on type
	async function createInput() {
		if (!container) return;

		// Clear previous input
		if (inputElement) {
			inputElement.remove();
			inputElement = null;
		}

		try {
			const inputOptions = {
				value,
				...options,
				...(min !== undefined && { min }),
				...(max !== undefined && { max }),
				...(step !== undefined && { step }),
				...(placeholder && { placeholder }),
				...(disabled && { disabled })
			};

			// Create input based on type
			switch (type) {
				case 'text':
					inputElement = text(inputOptions);
					break;
				case 'number':
					inputElement = number(inputOptions);
					break;
				case 'range':
					inputElement = range(inputOptions);
					break;
				case 'select':
					inputElement = select(inputOptions);
					break;
				case 'checkbox':
					inputElement = checkbox(inputOptions);
					break;
				case 'radio':
					inputElement = radio(inputOptions);
					break;
				case 'textarea':
					inputElement = textarea(inputOptions);
					break;
				default:
					inputElement = text(inputOptions);
			}

			// Add event listeners
			if (inputElement) {
				inputElement.addEventListener('input', handleInput);
				inputElement.addEventListener('change', handleChange);
				// eslint-disable-next-line svelte/no-dom-manipulating
				container.appendChild(inputElement);
			}
		} catch (error) {
			console.error('Error creating input:', error);
			renderFallbackInput();
		}
	}

	// Handle input events
	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const newValue = getInputValue(target);
		dispatch('input', { value: newValue, type });
	}

	// Handle change events
	function handleChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const newValue = getInputValue(target);
		dispatch('change', { value: newValue, type });
	}

	// Get value from input element based on type
	function getInputValue(element: HTMLInputElement): unknown {
		switch (type) {
			case 'checkbox':
				return element.checked;
			case 'number':
				return element.valueAsNumber;
			case 'range':
				return element.valueAsNumber;
			default:
				return element.value;
		}
	}

	// Fallback input if Observable inputs fail
	function renderFallbackInput() {
		const input = document.createElement('input');
		input.type = type === 'textarea' ? 'textarea' : type;
		input.value = String(value);
		input.placeholder = placeholder;
		input.disabled = disabled;

		if (min !== undefined) input.min = String(min);
		if (max !== undefined) input.max = String(max);
		if (step !== undefined) input.step = String(step);

		input.addEventListener('input', handleInput);
		input.addEventListener('change', handleChange);

		// eslint-disable-next-line svelte/no-dom-manipulating
		container.appendChild(input);
		inputElement = input;
	}

	// Reactive statement to recreate input when props change
	$effect(() => {
		createInput();
	});

	// Cleanup on destroy
	import { onDestroy } from 'svelte';
	onDestroy(() => {
		if (inputElement) {
			inputElement.removeEventListener('input', handleInput);
			inputElement.removeEventListener('change', handleChange);
		}
	});
</script>

<div class="observable-input {className}">
	{#if label}
		<label class="input-label" for="observable-input-{type}">{label}</label>
	{/if}
	<div bind:this={container} class="input-container" id="observable-input-{type}">
		<!-- Input will be dynamically inserted here -->
	</div>
</div>

<style>
	.observable-input {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
	}

	.input-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-gray-700);
	}

	.input-container {
		width: 100%;
	}

	.input-container :global(input),
	.input-container :global(select),
	.input-container :global(textarea) {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-gray-300);
		border-radius: 0.375rem;
		font-size: 0.875rem;
		background-color: var(--color-white);
		transition:
			border-color 0.15s ease-in-out,
			box-shadow 0.15s ease-in-out;
	}

	.input-container :global(input:focus),
	.input-container :global(select:focus),
	.input-container :global(textarea:focus) {
		outline: none;
		border-color: var(--color-blue-500);
		box-shadow: 0 0 0 3px var(--color-blue-100);
	}

	.input-container :global(input:disabled),
	.input-container :global(select:disabled),
	.input-container :global(textarea:disabled) {
		background-color: var(--color-gray-50);
		color: var(--color-gray-500);
		cursor: not-allowed;
	}

	.input-container :global(input[type='range']) {
		padding: 0;
		height: 0.5rem;
		background: transparent;
		border: none;
	}

	.input-container :global(input[type='checkbox']) {
		width: auto;
		margin-right: 0.5rem;
	}

	.input-container :global(input[type='radio']) {
		width: auto;
		margin-right: 0.5rem;
	}

	.input-container :global(textarea) {
		resize: vertical;
		min-height: 4rem;
	}
</style>
