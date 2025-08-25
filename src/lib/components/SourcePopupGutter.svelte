<script lang="ts">
	import { Braces, Code, Text } from 'lucide-svelte';
	import type { CellKind } from '$lib/types/cell';
	import Menu from './popup/Menu.svelte';
	import type { Item } from './popup/types';

	interface Props {
		isFocused: boolean;
		kind: CellKind;
	}

	let { isFocused, kind }: Props = $props();

	let hover = $state(false);
	let showPopup = $state(false);
	let popupPosition = $state({ top: 0, left: 0 });

	// Cell type options with display names
	const cellTypeOptions: Array<Item<CellKind>> = [
		{ value: 'js', label: 'JavaScript', icon: Braces },
		{ value: 'html', label: 'HTML', icon: Code },
		{ value: 'md', label: 'Markdown', icon: Text }
	];

	// Determine icon color based on focus and hover state
	let iconColor = $derived(hover ? 'text-gray-600' : 'text-gray-400');
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
		console.log('Selected option:', selectedKind);
		showPopup = false;
	}

	function handleClose() {
		showPopup = false;
	}
</script>

<div
	class="flex justify-center {backgroundColor} pt-1 cursor-pointer"
	role="button"
	tabindex="0"
	onmouseover={() => (hover = true)}
	onmouseleave={() => (hover = false)}
	onfocus={() => (hover = true)}
	onblur={() => (hover = false)}
	onclick={handleClick}
	onkeydown={(e) => e.key === 'Enter' && handleClick(e as unknown as MouseEvent)}
>
	{#if kind === 'js'}
		<Braces size={16} class={iconColor} />
	{:else if kind === 'md'}
		<Text size={16} class={iconColor} />
	{:else if kind === 'html'}
		<Code size={16} class={iconColor} />
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
