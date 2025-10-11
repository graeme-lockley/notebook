<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { X } from 'lucide-svelte';
	import type { UpdateNotebookEvent } from './event-types';
	import './modal-styles.css';

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
