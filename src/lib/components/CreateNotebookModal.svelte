<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { X } from 'lucide-svelte';
	import type { CreateNotebookEvent } from './event-types';
	import './modal-styles.css';

	let { isOpen = false } = $props();

	const dispatch = createEventDispatcher<{
		createNotebook: CreateNotebookEvent;
		cancel: void;
	}>();

	let notebookName = $state('');
	let notebookDescription = $state('');
	let notebookVisibility = $state<'private' | 'public'>('private');
	let nameInput = $state<HTMLInputElement>();

	function handleCreate() {
		if (notebookName.trim()) {
			dispatch('createNotebook', {
				name: notebookName.trim(),
				description: notebookDescription.trim(),
				visibility: notebookVisibility
			});
			resetForm();
			dispatch('cancel'); // Close the modal
		}
	}

	function handleCancel() {
		dispatch('cancel');
		resetForm();
	}

	function resetForm() {
		notebookName = '';
		notebookDescription = '';
		notebookVisibility = 'private';
	}

	function handleModalKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleCancel();
		}
	}

	// Reset form when modal opens and focus on name input
	$effect(() => {
		if (isOpen) {
			resetForm();
			// Focus on name input after a brief delay to ensure DOM is ready
			setTimeout(() => nameInput?.focus(), 0);
		}
	});
</script>

{#if isOpen}
	<div
		class="modal-overlay"
		data-testid="create-notebook-modal-overlay"
		onclick={handleCancel}
		onkeydown={(e) => e.key === 'Enter' && handleCancel()}
		tabindex="0"
		role="button"
		aria-label="Close modal"
	>
		<div
			class="modal-content"
			data-testid="create-notebook-modal"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<div class="modal-header">
				<h2 class="modal-title">Create New Notebook</h2>
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

				<div class="form-group">
					<label for="notebook-visibility" class="form-label">Visibility</label>
					<select
						id="notebook-visibility"
						bind:value={notebookVisibility}
						class="form-input"
						data-testid="notebook-visibility-input"
					>
						<option value="private">Private (Only you can see and edit)</option>
						<option value="public">Public (Everyone can see, only you can edit)</option>
					</select>
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
					onclick={handleCreate}
					class="modal-button modal-button-primary"
					data-testid="modal-create-button"
					disabled={!notebookName.trim()}
				>
					Create
				</button>
			</div>
		</div>
	</div>
{/if}
