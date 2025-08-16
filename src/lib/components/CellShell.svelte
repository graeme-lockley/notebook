<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import {
		GripVertical,
		Pin,
		MoreVertical,
		ChevronDown,
		ChevronUp,
		ChevronRight,
		AlertCircle,
		Code,
		FileText,
		Code2
	} from 'lucide-svelte';

	let {
		id,
		kind,
		isFocused = false,
		isPinned = false,
		isCollapsed = false,
		hasError = false,
		isClosed = false
	} = $props();

	const dispatch = createEventDispatcher<{
		focus: { id: string };
		pinToggle: { id: string; pinned: boolean };
		menuOpen: { id: string };
		collapseToggle: { id: string; collapsed: boolean };
		toggleClosed: { id: string }; // New event for toggling closed state
		dragStart: { id: string };
	}>();

	// Cell type configuration
	const cellTypeConfig = {
		js: { icon: Code, color: 'text-yellow-600', label: 'JavaScript' },
		md: { icon: FileText, color: 'text-blue-600', label: 'Markdown' },
		html: { icon: Code2, color: 'text-green-600', label: 'HTML' },
		input: { icon: Code, color: 'text-purple-600', label: 'Input' }
	};

	const typeConfig = cellTypeConfig[kind as keyof typeof cellTypeConfig];
	const TypeIcon = typeConfig.icon;

	function handleCellClick() {
		dispatch('focus', { id });
	}

	function handlePinToggle() {
		dispatch('pinToggle', { id, pinned: !isPinned });
	}

	function handleMenuOpen() {
		dispatch('menuOpen', { id });
	}

	function handleCollapseToggle() {
		dispatch('collapseToggle', { id, collapsed: !isCollapsed });
	}

	function handleToggleClosed() {
		dispatch('toggleClosed', { id });
	}

	function handleDragStart(event: MouseEvent) {
		event.stopPropagation();
		dispatch('dragStart', { id });
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleCellClick();
		}
	}
</script>

<div data-testid="cell-shell" class="cell-shell {isFocused ? 'focused' : ''}">
	<!-- Left Gutter -->
	<div
		data-testid="cell-gutter"
		class="cell-gutter {isFocused ? 'focused' : ''}"
		aria-hidden="true"
	>
		<!-- Drag Handle -->
		<button
			data-testid="drag-handle"
			class="drag-handle"
			onclick={handleDragStart}
			aria-label="Drag to reorder cell"
			title="Drag to reorder cell"
		>
			<GripVertical size={14} />
		</button>

		<!-- Cell Type Icon -->
		<div
			data-testid="cell-type-icon"
			data-kind={kind}
			class="cell-type-icon {typeConfig.color}"
			title={typeConfig.label}
		>
			<TypeIcon size={12} />
		</div>

		<!-- Pin Button -->
		<button
			data-testid="pin-button"
			class="gutter-button {isPinned ? 'pinned' : ''}"
			onclick={handlePinToggle}
			aria-label={isPinned ? 'Unpin cell' : 'Pin cell'}
			title={isPinned ? 'Unpin cell' : 'Pin cell'}
		>
			<Pin size={14} class={isPinned ? 'fill-current' : ''} />
		</button>

		<!-- Kebab Menu -->
		<button
			data-testid="kebab-menu-button"
			class="gutter-button kebab-menu"
			onclick={handleMenuOpen}
			aria-label="Cell actions"
			title="Cell actions"
		>
			<MoreVertical size={14} />
		</button>
	</div>

	<!-- Toggle Gutter (20px width) -->
	{#if isFocused}
		<div
			data-testid="toggle-gutter"
			class="toggle-gutter"
			role="button"
			tabindex="0"
			aria-label={isClosed ? 'Show source code' : 'Hide source code'}
			title={isClosed ? 'Show source code' : 'Hide source code'}
			onclick={handleToggleClosed}
			onkeydown={(e) => e.key === 'Enter' && handleToggleClosed()}
		>
			<div class="toggle-gutter-content">
				<ChevronRight size={14} class="toggle-icon {isClosed ? 'closed' : ''}" />
			</div>
		</div>
	{/if}

	<!-- Popup Gutter (20px width) -->
	{#if isFocused}
		<div
			data-testid="popup-gutter"
			class="popup-gutter"
			role="button"
			tabindex="0"
			aria-label="Cell menu"
			title="Cell menu"
			onclick={handleMenuOpen}
			onkeydown={(e) => e.key === 'Enter' && handleMenuOpen()}
		>
			<div class="popup-gutter-content">
				<MoreVertical size={14} class="popup-icon" />
			</div>
		</div>
	{/if}

	<!-- Main Content Area -->
	<div
		data-testid="cell-content"
		class="cell-content"
		role="button"
		tabindex="0"
		aria-label="Cell {id}"
		onclick={handleCellClick}
		onkeydown={handleKeyDown}
	>
		<slot />
	</div>

	<!-- Right Edge Context Icons -->
	<div class="context-icons">
		{#if hasError}
			<div data-testid="error-indicator" class="error-indicator" title="Cell has error">
				<AlertCircle size={14} />
			</div>
		{/if}

		{#if isCollapsed}
			<button
				data-testid="collapse-button"
				class="context-button"
				onclick={handleCollapseToggle}
				aria-label="Expand cell"
				title="Expand cell"
			>
				<ChevronDown size={14} />
			</button>
		{:else if isCollapsed !== undefined}
			<button
				data-testid="collapse-button"
				class="context-button context-button-hidden"
				onclick={handleCollapseToggle}
				aria-label="Collapse cell"
				title="Collapse cell"
			>
				<ChevronUp size={14} />
			</button>
		{/if}
	</div>
</div>

<style>
	.cell-shell {
		position: relative;
		display: flex;
		min-height: var(--cell-min-height);
		width: 100%;
		border-bottom: var(--border-width) solid var(--color-gray-100);
		background-color: var(--color-white);
		transition: background-color var(--transition-fast);
	}

	.cell-shell:hover {
		background-color: var(--color-gray-50);
	}

	.cell-shell.focused {
		background-color: var(--color-gray-50);
	}

	/* Left Gutter */
	.cell-gutter {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: var(--gutter-width);
		border-right: var(--border-width) solid var(--color-gray-100);
		background-color: var(--color-gray-50);
		transition: background-color var(--transition-fast);
	}

	.cell-gutter.focused {
		background-color: var(--color-gray-100);
	}

	.drag-handle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		margin-top: var(--space-2);
		border-radius: var(--border-radius);
		color: var(--color-gray-400);
		opacity: 0;
		transition: opacity var(--transition-fast);
		background: transparent;
		border: none;
		cursor: pointer;
	}

	.cell-shell:hover .drag-handle {
		opacity: 1;
	}

	.drag-handle:hover {
		color: var(--color-gray-600);
	}

	.cell-type-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		margin-top: var(--space-1);
		border-radius: var(--border-radius);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
	}

	.text-yellow-600 {
		color: var(--color-js);
	}
	.text-blue-600 {
		color: var(--color-md);
	}
	.text-green-600 {
		color: var(--color-html);
	}

	.gutter-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		margin-top: var(--space-1);
		border-radius: var(--border-radius);
		color: var(--color-gray-400);
		background: transparent;
		border: none;
		cursor: pointer;
		transition: color var(--transition-fast);
	}

	.gutter-button:hover {
		color: var(--color-gray-600);
	}

	.gutter-button.pinned {
		color: var(--color-primary);
	}

	.kebab-menu {
		opacity: 0;
		transition: opacity var(--transition-fast);
	}

	.cell-shell:hover .kebab-menu {
		opacity: 1;
	}

	/* Toggle Gutter */
	.toggle-gutter {
		width: 1.25rem;
		border-right: var(--border-width) solid var(--color-gray-100);
		background-color: var(--color-gray-50);
		transition: background-color var(--transition-fast);
		cursor: pointer;
	}

	.toggle-gutter-content {
		display: flex;
		height: 100%;
		align-items: flex-start;
		justify-content: center;
		padding-top: var(--space-2);
	}

	.toggle-icon {
		color: var(--color-gray-400);
		transition: color var(--transition-fast);
	}

	.toggle-icon:hover {
		color: var(--color-gray-600);
	}

	.toggle-icon.closed {
		color: var(--color-gray-600);
	}

	/* Popup Gutter */
	.popup-gutter {
		width: 1.25rem;
		border-right: var(--border-width) solid var(--color-gray-100);
		background-color: var(--color-gray-50);
		transition: background-color var(--transition-fast);
		cursor: pointer;
	}

	.popup-gutter-content {
		display: flex;
		height: 100%;
		align-items: flex-start;
		justify-content: center;
		padding-top: var(--space-2);
	}

	.popup-icon {
		color: var(--color-gray-400);
		transition: color var(--transition-fast);
	}

	.popup-icon:hover {
		color: var(--color-gray-600);
	}

	/* Main Content Area */
	.cell-content {
		flex: 1;
		cursor: pointer;
		padding: var(--space-4);
	}

	/* Context Icons */
	.context-icons {
		position: absolute;
		top: var(--space-2);
		right: var(--space-2);
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.error-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: var(--border-radius);
		color: var(--color-error);
	}

	.context-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: var(--border-radius);
		color: var(--color-gray-400);
		background: transparent;
		border: none;
		cursor: pointer;
		transition: color var(--transition-fast);
	}

	.context-button:hover {
		color: var(--color-gray-600);
	}

	.context-button-hidden {
		opacity: 0;
		transition: opacity var(--transition-fast);
	}

	.cell-shell:hover .context-button-hidden {
		opacity: 1;
	}
</style>
