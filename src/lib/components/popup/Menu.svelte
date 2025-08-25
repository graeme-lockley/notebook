<script lang="ts" generics="T">
	import { Check } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import type { Item } from './types';

	interface Props<T> {
		options: Item<T>[];
		selectedValue: T;
		position: { top: number; left: number };
		onOptionClick: (value: T) => void;
		onClose: () => void;
	}

	let { options, selectedValue, position, onOptionClick, onClose }: Props<T> = $props();

	function handleClickOutside(event: MouseEvent) {
		if (!(event.target as Element).closest('[data-testid="cell-type-button"]')) {
			onClose();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		document.addEventListener('keydown', handleKeydown);

		return () => {
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<ul class="popup-menu" style="top: {position.top - 20}px; left: {position.left + 5}px;">
	{#each options as option (option.value)}
		{@const isSelected = option.value === selectedValue}
		{@const itemClass = isSelected ? 'popup-menu-item popup-menu-item-selected' : 'popup-menu-item'}

		<li
			class={itemClass}
			role="menuitem"
			data-testid="cell-type-option-{option.value}"
			onclick={() => onOptionClick(option.value)}
			onkeydown={(e) => e.key === 'Enter' && onOptionClick(option.value)}
			tabindex="0"
		>
			<div class="popup-menu-item-content">
				<div class="popup-menu-item-icon">
					<div class="popup-menu-icon-wrapper">
						{@render option.icon({
							size: 14,
							class: isSelected ? 'popup-menu-icon-selected' : 'popup-menu-icon'
						})}
					</div>
				</div>
				<span class={isSelected ? 'popup-menu-text-selected' : 'popup-menu-text'}
					>{option.label}</span
				>
			</div>
			{#if isSelected}
				<div class="popup-menu-check">
					<Check size={16} class="popup-menu-check-icon" />
				</div>
			{/if}
		</li>
	{/each}
</ul>

<style>
	.popup {
		position: fixed;
		top: 0;
		left: 0;
		pointer-events: auto;
	}

	.popup-menu {
		background-color: var(--color-white);
		border: var(--border-width) solid var(--border-color);
		border-radius: var(--border-radius-md);
		box-shadow: var(--shadow-lg);
		min-width: 160px;
		position: fixed;
		top: 0;
		left: 0;
		pointer-events: auto;
		z-index: 2147483647;
	}

	.popup-menu-item {
		padding: var(--space-1) var(--space-1);
		text-align: left;
		font-size: var(--font-size-sm);
		display: flex;
		align-items: center;
		justify-content: space-between;
		transition: background-color var(--transition-fast);
		cursor: pointer;
	}

	.popup-menu-item:hover {
		background-color: var(--color-gray-100);
	}

	.popup-menu-item:focus {
		background-color: var(--color-gray-100);
		outline: none;
	}

	.popup-menu-item-selected {
		background-color: var(--color-gray-50);
	}

	.popup-menu-item-content {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.popup-menu-item-icon {
		display: flex;
		align-items: center;
		padding-left: var(--space-2);
	}

	.popup-menu-icon-wrapper {
		width: 16px;
		height: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.popup-menu-icon {
		color: var(--color-gray-600);
	}

	.popup-menu-icon-selected {
		color: var(--color-primary);
	}

	.popup-menu-text {
		color: var(--color-gray-700);
	}

	.popup-menu-text-selected {
		color: var(--color-primary);
	}

	.popup-menu-check {
		display: flex;
		align-items: center;
		margin-left: var(--space-4);
	}

	.popup-menu-check-icon {
		color: var(--color-primary);
	}
</style>
