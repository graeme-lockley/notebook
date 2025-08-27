<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import {
		ArrowDownFromLine,
		ArrowUpFromLine,
		Copy,
		EllipsisVertical,
		Trash2
	} from 'lucide-svelte';
	import Menu from './popup/Menu.svelte';
	import type { Item } from './popup/types';
	import type {
		DeleteCellEvent,
		MoveCellUpEvent,
		MoveCellDownEvent,
		DuplicateCellEvent
	} from './event-types';

	interface Props {
		id: string;
		isFocused: boolean;
	}

	type PopupHandler = () => void;

	let { id, isFocused }: Props = $props();

	const dispatch = createEventDispatcher<{
		DeleteCell: DeleteCellEvent;
		MoveCellUp: MoveCellUpEvent;
		MoveCellDown: MoveCellDownEvent;
		DuplicateCell: DuplicateCellEvent;
	}>();

	let showPopup = $state(false);
	let popupPosition = $state({ top: 0, left: 0 });

	// Cell type options with display names
	const cellTypeOptions: Array<Item<PopupHandler>> = [
		{ value: () => dispatch('DuplicateCell', { id }), label: 'Duplicate', icon: Copy },
		{ value: () => dispatch('MoveCellUp', { id }), label: 'Move up', icon: ArrowUpFromLine },
		{ value: () => dispatch('MoveCellDown', { id }), label: 'Move down', icon: ArrowDownFromLine },
		{ value: () => dispatch('DeleteCell', { id }), label: 'Delete', icon: Trash2 }
	];

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

	function handleOptionClick(handler: PopupHandler) {
		handler();

		showPopup = false;
	}

	function handleClose() {
		showPopup = false;
	}
</script>

{#if isFocused}
	<div
		class="flex justify-center bg-gray-100 pt-1"
		role="button"
		tabindex="0"
		onclick={handleClick}
		onkeydown={(e) => e.key === 'Enter' && handleClick(e as unknown as MouseEvent)}
	>
		<EllipsisVertical size={16} class="text-gray-400 hover:text-gray-600" />
	</div>

	{#if showPopup}
		<Menu
			options={cellTypeOptions}
			selectedValue={undefined}
			position={popupPosition}
			onOptionClick={handleOptionClick}
			onClose={handleClose}
		/>
	{/if}
{:else}
	<div></div>
{/if}
