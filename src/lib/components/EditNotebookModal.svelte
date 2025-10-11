<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { X } from 'lucide-svelte';
	import type { UpdateNotebookEvent } from './event-types';

	let { isOpen = false, currentTitle = '', currentDescription = '' } = $props();

	const dispatch = createEventDispatcher<{
		updateNotebook: UpdateNotebookEvent;
		cancel: void;
	}>();

	let notebookName = $state('');
	let notebookDescription = $state('');
	let nameInput = $state<HTMLInputElement>();

	function handleUpdate() {
		if (notebookName.trim()) {
			dispatch('updateNotebook', {
				title: notebookName.trim(),
				description: notebookDescription.trim()
			});
			dispatch('cancel'); // Close the modal
		}
	}

	function handleCancel() {
		dispatch('cancel');
	}

	function handleModalKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleCancel();
		}
	}

	// Pre-populate form when modal opens
	$effect(() => {
		if (isOpen) {
			notebookName = currentTitle;
			notebookDescription = currentDescription || '';
			// Focus on name input after a brief delay to ensure DOM is ready
			setTimeout(() => nameInput?.focus(), 0);
		}
	});
</script>

{#if isOpen}
	<div
		class="modal-overlay"
		data-testid="edit-notebook-modal-overlay"
		onclick={handleCancel}
		onkeydown={(e) => e.key === 'Enter' && handleCancel()}
		tabindex="0"
		role="button"
		aria-label="Close modal"
	>
		<div
			class="modal-content"
			data-testid="edit-notebook-modal"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<div class="modal-header">
				<h2 class="modal-title">Edit Notebook</h2>
				<button
					onclick={handleCancel}
					class="modal-close-button"
					data-testid="modal-close-button"
					title="Close modal"
				>
					<X size={20} />
				</button>
			</div>

			<div class="modal-body">
				<div class="form-group">
					<label for="notebook-name" class="form-label">Notebook Name</label>
					<input
						id="notebook-name"
						type="text"
						bind:value={notebookName}
						bind:this={nameInput}
						class="form-input"
						placeholder="Enter notebook name"
						data-testid="notebook-name-input"
						onkeydown={handleModalKeydown}
					/>
				</div>

				<div class="form-group">
					<label for="notebook-description" class="form-label">Description (Optional)</label>
					<textarea
						id="notebook-description"
						bind:value={notebookDescription}
						class="form-textarea"
						placeholder="Enter notebook description"
						data-testid="notebook-description-input"
						rows="3"
					></textarea>
				</div>
			</div>

			<div class="modal-footer">
				<button
					onclick={handleCancel}
					class="modal-button modal-button-secondary"
					data-testid="modal-cancel-button"
				>
					Cancel
				</button>
				<button
					onclick={handleUpdate}
					class="modal-button modal-button-primary"
					data-testid="modal-save-button"
					disabled={!notebookName.trim()}
				>
					Save
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Modal Styles */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal-content {
		background-color: var(--color-white);
		border-radius: var(--border-radius);
		box-shadow:
			0 20px 25px -5px rgba(0, 0, 0, 0.1),
			0 10px 10px -5px rgba(0, 0, 0, 0.04);
		width: 100%;
		max-width: 500px;
		margin: var(--space-4);
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-6);
		border-bottom: var(--border-width) solid var(--color-gray-200);
	}

	.modal-title {
		margin: 0;
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-gray-900);
	}

	.modal-close-button {
		background: transparent;
		border: none;
		cursor: pointer;
		padding: var(--space-1);
		border-radius: var(--border-radius);
		color: var(--color-gray-500);
		transition: background-color var(--transition-fast);
	}

	.modal-close-button:hover {
		background-color: var(--color-gray-100);
		color: var(--color-gray-700);
	}

	.modal-body {
		padding: var(--space-6);
	}

	.form-group {
		margin-bottom: var(--space-4);
	}

	.form-group:last-child {
		margin-bottom: 0;
	}

	.form-label {
		display: block;
		margin-bottom: var(--space-2);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-gray-700);
	}

	.form-input,
	.form-textarea {
		width: 100%;
		padding: var(--space-2) var(--space-3);
		border: var(--border-width) solid var(--color-gray-300);
		border-radius: var(--border-radius);
		font-size: var(--font-size-sm);
		color: var(--color-gray-900);
		background-color: var(--color-white);
		transition:
			border-color var(--transition-fast),
			box-shadow var(--transition-fast);
	}

	.form-input:focus,
	.form-textarea:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.form-textarea {
		resize: vertical;
		min-height: 80px;
	}

	.modal-footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-3);
		padding: var(--space-4) var(--space-6);
		border-top: var(--border-width) solid var(--color-gray-200);
	}

	.modal-button {
		padding: var(--space-2) var(--space-4);
		border-radius: var(--border-radius);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition:
			background-color var(--transition-fast),
			border-color var(--transition-fast);
		border: var(--border-width) solid transparent;
	}

	.modal-button-primary {
		background-color: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.modal-button-primary:hover:not(:disabled) {
		background-color: #1d4ed8;
		border-color: #1d4ed8;
	}

	.modal-button-primary:disabled {
		background-color: var(--color-gray-300);
		border-color: var(--color-gray-300);
		color: var(--color-gray-500);
		cursor: not-allowed;
	}

	.modal-button-secondary {
		background-color: transparent;
		color: var(--color-gray-700);
		border-color: var(--color-gray-300);
	}

	.modal-button-secondary:hover {
		background-color: var(--color-gray-50);
		border-color: var(--color-gray-400);
	}
</style>
