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

<ul
	class="bg-white border border-gray-200 rounded-lg shadow-lg min-w-[160px] popup"
	style="top: {position.top - 20}px; left: {position.left + 5}px;"
>
	{#each options as option (option.value)}
		{@const isSelected = option.value === selectedValue}
		{@const iconColorClass = isSelected ? 'text-blue-600' : 'text-gray-600'}
		{@const textColorClass = isSelected ? 'text-blue-600' : 'text-gray-700'}
		{@const bgClass = isSelected ? 'bg-blue-50' : ''}

		<li
			class="px-4 py-3 text-left text-sm flex items-center justify-between hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors duration-150 cursor-pointer {bgClass}"
			role="menuitem"
			data-testid="cell-type-option-{option.value}"
			onclick={() => onOptionClick(option.value)}
			onkeydown={(e) => e.key === 'Enter' && onOptionClick(option.value)}
			tabindex="0"
		>
			<div class="flex items-center gap-4">
				<div class="flex items-center">
					{@render option.icon({ size: 16, class: iconColorClass })}
				</div>
				<span class={textColorClass}>{option.label}</span>
			</div>
			{#if isSelected}
				<div class="flex items-center ml-4">
					<Check size={16} class="text-blue-600" />
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
		z-index: 2147483647;
	}
</style>
