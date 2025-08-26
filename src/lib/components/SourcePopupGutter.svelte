<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Braces, Code, Text } from 'lucide-svelte';
	import type { CellKind } from '$lib/types/cell';
	import Menu from './popup/Menu.svelte';
	import type { Item } from './popup/types';
	import type { SourceKindChangeEvent } from './event-types';

	interface Props {
		id: string;
		isFocused: boolean;
		kind: CellKind;
	}

	let { id, isFocused, kind }: Props = $props();

	const dispatch = createEventDispatcher<{
		SourceKindChange: SourceKindChangeEvent;
	}>();

	let showPopup = $state(false);
	let popupPosition = $state({ top: 0, left: 0 });

	// Cell type options with display names
	const cellTypeOptions: Array<Item<CellKind>> = [
		{ value: 'js', label: 'JavaScript', icon: Braces },
		{ value: 'html', label: 'HTML', icon: Code },
		{ value: 'md', label: 'Markdown', icon: Text }
	];

	// Determine background color based on focus state
	let backgroundColor = $derived(isFocused ? 'bg-gray-100' : '');

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
		dispatch('SourceKindChange', { id, kind: selectedKind });
		showPopup = false;
	}

	function handleClose() {
		showPopup = false;
	}
</script>

<div
	class="flex justify-center {backgroundColor} text-gray-400 hover:text-gray-600 pt-1 cursor-pointer"
	role="button"
	tabindex="0"
	onclick={handleClick}
	onkeydown={(e) => e.key === 'Enter' && handleClick(e as unknown as MouseEvent)}
>
	{#if kind === 'js'}
		<Braces size={16} />
	{:else if kind === 'md'}
		<Text size={16} />
	{:else if kind === 'html'}
		<Code size={16} />
	{/if}
</div>

{#if showPopup}
	<Menu
		options={cellTypeOptions}
		selectedValue={kind}
		position={popupPosition}
		onOptionClick={handleOptionClick}
		onClose={handleClose}
	/>
{/if}
