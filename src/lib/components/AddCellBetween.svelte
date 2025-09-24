<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Braces, Code, Text, Plus } from 'lucide-svelte';
	import type { CellKind } from '$lib/server/domain/value-objects/CellKind';
	import Menu from './popup/Menu.svelte';
	import type { Item } from './popup/types';
	import type { CellCreatedEvent } from './event-types';

	interface Props {
		cellBeforeId?: string;
		cellAfterId?: string;
		focusedCellId: string | undefined;
	}

	let { cellBeforeId, cellAfterId, focusedCellId }: Props = $props();

	let showPopup = $state(false);
	let popupPosition = $state({ top: 0, left: 0 });
	let isFocused = $derived(cellAfterId === focusedCellId || cellBeforeId === focusedCellId);

	const newCellOptions: Array<Item<CellKind>> = [
		{ value: 'js', label: 'JavaScript', icon: Braces },
		{ value: 'html', label: 'HTML', icon: Code },
		{ value: 'md', label: 'Markdown', icon: Text }
	];

	const dispatch = createEventDispatcher<{
		CellCreated: CellCreatedEvent;
	}>();

	function handleClick(event: MouseEvent) {
		if (!showPopup) {
			// Calculate position based on the clicked element
			const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
			popupPosition = {
				top: rect.top,
				left: rect.right + 8
			};
		}
		showPopup = !showPopup;
	}

	function handleOptionClick(selectedKind: CellKind) {
		dispatch('CellCreated', {
			cellBeforeId: cellBeforeId,
			cellAfterId: cellAfterId,
			cellKind: selectedKind
		});
		showPopup = false;
	}

	function handleClose() {
		showPopup = false;
	}
</script>

<div class="notebook-editor-row">
	<div></div>
	<div class="flex items-center justify-center">
		<div
			onclick={handleClick}
			onkeydown={(e) => e.key === 'Enter' && handleClick(e as unknown as MouseEvent)}
			class="cursor-pointer hover:bg-gray-100 hover:text-gray-600 rounded transition-colors p-1 {isFocused
				? 'text-gray-400'
				: 'text-white'}"
			data-testid="add-cell-button"
			tabindex="0"
			role="button"
		>
			<Plus size={16} />
		</div>
	</div>
	<div></div>
</div>

{#if showPopup}
	<Menu
		options={newCellOptions}
		selectedValue={undefined}
		position={popupPosition}
		onOptionClick={handleOptionClick}
		onClose={handleClose}
	/>
{/if}
