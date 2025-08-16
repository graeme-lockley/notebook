<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import {
		Copy,
		Trash2,
		Edit,
		Eye,
		EyeOff,
		Pin,
		PinOff,
		MoreHorizontal,
		ChevronDown,
		ChevronUp
	} from 'lucide-svelte';

	let {
		id,
		isVisible = true,
		isPinned = false,
		isCollapsed = false,
		hasComment = false
	} = $props();

	const dispatch = createEventDispatcher<{
		copy: { id: string };
		delete: { id: string };
		edit: { id: string };
		toggleVisibility: { id: string; visible: boolean };
		togglePin: { id: string; pinned: boolean };
		toggleCollapse: { id: string; collapsed: boolean };
		duplicate: { id: string };
		comment: { id: string };
	}>();

	let isOpen = $state(false);
	let menuRef: HTMLDivElement;

	const menuItems = [
		{
			id: 'copy',
			label: 'Copy',
			icon: Copy,
			action: () => dispatch('copy', { id }),
			shortcut: '⌘C'
		},
		{
			id: 'duplicate',
			label: 'Duplicate',
			icon: Copy,
			action: () => dispatch('duplicate', { id }),
			shortcut: '⌘D'
		},
		{
			id: 'edit',
			label: 'Edit',
			icon: Edit,
			action: () => dispatch('edit', { id }),
			shortcut: '⌘E'
		},
		{
			id: 'visibility',
			label: isVisible ? 'Hide' : 'Show',
			icon: isVisible ? EyeOff : Eye,
			action: () => dispatch('toggleVisibility', { id, visible: !isVisible }),
			shortcut: '⌘H'
		},
		{
			id: 'pin',
			label: isPinned ? 'Unpin' : 'Pin',
			icon: isPinned ? PinOff : Pin,
			action: () => dispatch('togglePin', { id, pinned: !isPinned }),
			shortcut: '⌘P'
		},
		{
			id: 'collapse',
			label: isCollapsed ? 'Expand' : 'Collapse',
			icon: isCollapsed ? ChevronDown : ChevronUp,
			action: () => dispatch('toggleCollapse', { id, collapsed: !isCollapsed }),
			shortcut: '⌘K'
		},
		{
			id: 'comment',
			label: hasComment ? 'Remove Comment' : 'Add Comment',
			icon: Edit,
			action: () => dispatch('comment', { id }),
			shortcut: '⌘/'
		},
		{
			id: 'delete',
			label: 'Delete',
			icon: Trash2,
			action: () => dispatch('delete', { id }),
			shortcut: '⌫',
			danger: true
		}
	];

	function handleToggle() {
		isOpen = !isOpen;
	}

	function handleItemClick(action: () => void) {
		action();
		isOpen = false;
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			isOpen = false;
		}
	}

	function handleClickOutside(event: MouseEvent) {
		if (menuRef && !menuRef.contains(event.target as Node)) {
			isOpen = false;
		}
	}

	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside);
			return () => {
				document.removeEventListener('click', handleClickOutside);
			};
		}
	});
</script>

<div class="relative" bind:this={menuRef}>
	<!-- Menu Trigger Button -->
	<button
		data-testid="kebab-menu-button"
		class="h-6 w-6 rounded text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors duration-150"
		onclick={handleToggle}
		onkeydown={handleKeyDown}
		aria-expanded={isOpen}
		aria-haspopup="true"
		aria-label="Cell actions"
		title="Cell actions"
	>
		<MoreHorizontal size={14} />
	</button>

	<!-- Dropdown Menu -->
	{#if isOpen}
		<div
			data-testid="cell-menu"
			class="right-0 mt-1 rounded-md border-gray-200 bg-white py-1 shadow-lg absolute top-full z-50 min-w-[200px] border"
			role="menu"
			aria-label="Cell actions"
		>
			{#each menuItems as item (item.id)}
				<button
					data-testid="menu-item-{item.id}"
					class="px-4 py-2 text-sm hover:bg-gray-100 flex w-full items-center justify-between text-left transition-colors duration-150 {item.danger
						? 'text-red-600 hover:text-red-700'
						: 'text-gray-700'}"
					onclick={() => handleItemClick(item.action)}
					role="menuitem"
					aria-label={item.label}
				>
					<div class="space-x-3 flex items-center">
						{#if item.icon === Copy}
							<Copy size={16} />
						{:else if item.icon === Trash2}
							<Trash2 size={16} />
						{:else if item.icon === Edit}
							<Edit size={16} />
						{:else if item.icon === Eye}
							<Eye size={16} />
						{:else if item.icon === EyeOff}
							<EyeOff size={16} />
						{:else if item.icon === Pin}
							<Pin size={16} />
						{:else if item.icon === PinOff}
							<PinOff size={16} />
						{:else if item.icon === ChevronDown}
							<ChevronDown size={16} />
						{:else if item.icon === ChevronUp}
							<ChevronUp size={16} />
						{/if}
						<span>{item.label}</span>
					</div>
					<span class="text-xs text-gray-500">{item.shortcut}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
