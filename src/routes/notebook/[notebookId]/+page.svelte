<script lang="ts">
	import TopBar from '$lib/components/TopBar.svelte';
	import FooterBar from '$lib/components/FooterBar.svelte';
	import NotebookEditor from '$lib/components/NotebookEditor.svelte';
	import { createNotebookStore, type NotebookStore } from '$lib/stores/notebook';
	import { ReactiveNotebook } from '$lib/model/cell';
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { SvelteMap } from 'svelte/reactivity';

	let notebookStore: NotebookStore | undefined;
	let loading = true;
	let error: string | null = null;
	let eventSource: EventSource | null = null;
	let cellIdMapping: Map<string, string> = new SvelteMap(); // Maps client cell IDs to server cell IDs
	let lastProcessedEventId: string | null = null; // Track the last processed event ID

	// Get the notebookId from the URL parameters
	$: notebookId = $page.params.notebookId;

	// Helper function to extract sequence number from event ID
	function extractSequenceNumber(eventId: string): number | null {
		// Event ID format: <topic>-<number>
		const parts = eventId.split('-');
		if (parts.length < 2) {
			return null;
		}
		const sequenceStr = parts[parts.length - 1];
		const sequence = parseInt(sequenceStr, 10);
		return isNaN(sequence) ? null : sequence;
	}

	// Helper function to check if an event is newer than the last processed one
	function isEventNewer(eventId: string): boolean {
		if (!lastProcessedEventId) {
			return true; // First event is always newer
		}

		const currentSeq = extractSequenceNumber(eventId);
		const lastSeq = extractSequenceNumber(lastProcessedEventId);

		if (currentSeq === null || lastSeq === null) {
			return true; // If we can't parse, assume it's newer
		}

		return currentSeq > lastSeq;
	}

	onMount(async () => {
		if (notebookId) {
			await loadNotebook(notebookId);
		}
	});

	async function loadNotebook(id: string) {
		try {
			loading = true;
			error = null;

			// Fetch notebook data from API
			const response = await fetch(`/api/notebooks/${id}`);

			if (!response.ok) {
				if (response.status === 404) {
					throw new Error('Notebook not found');
				}
				throw new Error(`Failed to load notebook: ${response.statusText}`);
			}

			const notebookData = await response.json();

			// Create a new notebook with the fetched data
			const notebook = new ReactiveNotebook({
				title: notebookData.title,
				description: notebookData.description || ''
			});

			// Add all cells from the API response to the notebook
			if (notebookData.cells && Array.isArray(notebookData.cells)) {
				const cells = notebookData.cells;

				for (const cellData of cells) {
					const clientCell = await notebook.addCell({
						kind: cellData.kind,
						value: cellData.value,
						focus: false // Don't focus on loaded cells
					});

					// Map the client-generated ID to the server ID
					cellIdMapping.set(clientCell.id, cellData.id);
				}
			} else {
				console.error('Cell field not found in notebook data', notebookData);
			}

			notebookStore = createNotebookStore(notebook);

			// Set up event stream for real-time updates
			if (notebookId) {
				setupEventStream(notebookId);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load notebook';
			console.error('Error loading notebook:', err);
		} finally {
			loading = false;
		}
	}

	function setupEventStream(notebookId: string) {
		// Close existing event source if any
		if (eventSource) {
			eventSource.close();
		}

		// Create new event source
		eventSource = new EventSource(`/api/notebooks/${notebookId}/events`);

		eventSource.onopen = () => {
			console.log('Event stream connected');
		};

		eventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				handleServerEvent(data);
			} catch (err) {
				console.error('Error parsing server event:', err);
			}
		};

		eventSource.onerror = (error) => {
			console.error('Event stream error:', error);

			// Close the current connection
			if (eventSource) {
				eventSource.close();
				eventSource = null;
			}

			// Reconnect after a delay
			setTimeout(() => {
				if (notebookId) {
					console.log('Attempting to reconnect event stream...');
					setupEventStream(notebookId);
				}
			}, 5000);
		};
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function handleServerEvent(eventData: any) {
		if (!notebookStore) return;

		switch (eventData.type) {
			case 'notebook.initialized': {
				// Initial data - cells are already loaded from the API
				console.log('Notebook initialized with', eventData.data.cells.length, 'cells');
				break;
			}
			case 'notebook.updated': {
				// Update cells from server
				const eventId = eventData.data.event?.id;
				console.log('Received notebook.updated event:', eventData.data.event);

				if (eventId && isEventNewer(eventId)) {
					console.log('Processing newer event:', eventId);
					updateCellsFromServer(eventData.data.cells);
					lastProcessedEventId = eventId;
				} else {
					console.log('Skipping older event:', eventId, 'last processed:', lastProcessedEventId);
				}
				break;
			}
			case 'heartbeat': {
				// Just a heartbeat to keep connection alive
				console.log('Event stream heartbeat received');
				break;
			}
			default:
				console.log('Unknown event type:', eventData.type);
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function updateCellsFromServer(serverCells: any[]) {
		if (!notebookStore) return;

		console.log('Updating cells from server:', serverCells);

		const currentCells = notebookStore.notebook.cells;

		// Check if the order has changed by comparing server order with current order
		const serverOrder = serverCells
			.map((serverCell) => {
				const clientCellId = Array.from(cellIdMapping.entries()).find(
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					([_, serverId]) => serverId === serverCell.id
				)?.[0];
				return clientCellId;
			})
			.filter(Boolean);

		const currentOrder = currentCells.map((cell) => cell.id);

		const orderChanged =
			serverOrder.length === currentOrder.length &&
			!serverOrder.every((id, index) => id === currentOrder[index]);

		if (orderChanged) {
			console.log('Cell order changed, reordering cells');
			console.log('Server order:', serverOrder);
			console.log('Current order:', currentOrder);

			// Reorder cells to match server order
			const reorderedCells = serverOrder
				.map((clientCellId) => currentCells.find((cell) => cell.id === clientCellId))
				.filter((cell): cell is NonNullable<typeof cell> => cell !== undefined);

			// Remove all current cells
			const cellIdsToRemove = [...currentCells.map((cell) => cell.id)];
			cellIdsToRemove.forEach((cellId) => {
				notebookStore?.notebook.removeCell(cellId);
			});

			// Add cells back in the new order
			reorderedCells.forEach((cell) => {
				notebookStore?.notebook.addCell({
					kind: cell.kind,
					value: cell.value,
					focus: false
				});
			});

			return; // Skip the rest of the update logic since we've reordered
		}

		// Remove cells that don't exist on server
		for (let i = currentCells.length - 1; i >= 0; i--) {
			const cell = currentCells[i];
			const serverCellId = cellIdMapping.get(cell.id);
			if (!serverCells.find((serverCell) => serverCell.id === serverCellId)) {
				console.log('Removing cell:', cell.id);
				notebookStore.notebook.removeCell(cell.id);
				cellIdMapping.delete(cell.id);
			}
		}

		// Add or update cells from server
		for (const serverCell of serverCells) {
			// Find existing cell by server ID
			const existingClientCellId = Array.from(cellIdMapping.entries()).find(
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				([_, serverId]) => serverId === serverCell.id
			)?.[0];

			if (!existingClientCellId) {
				// Add new cell
				console.log('Adding new cell:', serverCell.id);
				notebookStore.notebook
					.addCell({
						kind: serverCell.kind,
						value: serverCell.value,
						focus: false
					})
					.then((clientCell) => {
						// Map the new client cell ID to the server cell ID
						cellIdMapping.set(clientCell.id, serverCell.id);
						console.log('Mapped new cell:', clientCell.id, '->', serverCell.id);
					});
			} else {
				// Update existing cell
				const existingCell = currentCells.find((cell) => cell.id === existingClientCellId);
				if (existingCell) {
					// Check if we need to update the cell
					const needsUpdate =
						existingCell.value !== serverCell.value || existingCell.kind !== serverCell.kind;

					if (needsUpdate) {
						console.log(
							'Updating cell:',
							existingCell.id,
							'from',
							existingCell.value,
							'to',
							serverCell.value
						);

						// Update the cell value and kind
						notebookStore.notebook.updateCell(existingCell.id, {
							value: serverCell.value,
							kind: serverCell.kind
						});
					}
				}
			}
		}
	}

	onDestroy(() => {
		if (eventSource) {
			eventSource.close();
		}
	});

	function handleTitleChange(event: CustomEvent) {
		if (notebookStore) {
			const { title } = event.detail;
			notebookStore.updateTitle(title);
		}
	}

	function handleNewNotebook(event: CustomEvent) {
		// Handle new notebook creation - redirect to the new notebook
		const { name, description } = event.detail;
		console.log('Creating new notebook:', { name, description });
		// The TopBar component will handle the API call and navigation
	}

	async function addCellToServer(kind: 'js' | 'md' | 'html', value: string, position: number) {
		if (!notebookId) return;

		try {
			const response = await fetch(`/api/notebooks/${notebookId}/cells`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					kind,
					value,
					position
				})
			});

			if (!response.ok) {
				throw new Error(`Failed to add cell: ${response.statusText}`);
			}

			// The event stream will handle updating the UI
			console.log('Cell added successfully, waiting for server event...');
		} catch (error) {
			console.error('Error adding cell:', error);
			// You might want to show an error message to the user
		}
	}

	async function updateCellOnServer(cellId: string, updates: { kind?: string; value?: string }) {
		if (!notebookId) return;

		console.log('Updating cell on server:', cellId, updates);

		// Get the server cell ID from the mapping
		const serverCellId = cellIdMapping.get(cellId);
		if (!serverCellId) {
			console.error('No server cell ID found for client cell ID:', cellId);
			// For cells that don't have a server ID (like the welcome cell),
			// we need to create them on the server first
			await createCellOnServer(cellId, updates);
			return;
		}

		try {
			const response = await fetch(`/api/notebooks/${notebookId}/cells/${serverCellId}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(updates)
			});

			if (!response.ok) {
				throw new Error(`Failed to update cell: ${response.statusText}`);
			}

			console.log('Cell updated successfully, waiting for server event...');
		} catch (error) {
			console.error('Error updating cell:', error);
		}
	}

	async function createCellOnServer(
		clientCellId: string,
		updates: { kind?: string; value?: string }
	) {
		if (!notebookId || !notebookStore) return;

		try {
			// Find the cell in the notebook to get its current state
			const cell = notebookStore.notebook.cells.find((c) => c.id === clientCellId);
			if (!cell) {
				console.error('Cell not found in notebook:', clientCellId);
				return;
			}

			// Get the position of the cell
			const position = notebookStore.notebook.cells.findIndex((c) => c.id === clientCellId);

			// Create the cell on the server
			const response = await fetch(`/api/notebooks/${notebookId}/cells`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					kind: updates.kind || cell.kind,
					value: updates.value !== undefined ? updates.value : cell.value,
					position
				})
			});

			if (!response.ok) {
				throw new Error(`Failed to create cell: ${response.statusText}`);
			}

			console.log('Cell created on server, waiting for server event...');
		} catch (error) {
			console.error('Error creating cell on server:', error);
		}
	}

	async function deleteCellOnServer(cellId: string) {
		if (!notebookId) return;

		// Get the server cell ID from the mapping
		const serverCellId = cellIdMapping.get(cellId);
		if (!serverCellId) {
			console.error('No server cell ID found for client cell ID:', cellId);
			return;
		}

		try {
			const response = await fetch(`/api/notebooks/${notebookId}/cells/${serverCellId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error(`Failed to delete cell: ${response.statusText}`);
			}

			console.log('Cell deleted successfully, waiting for server event...');
		} catch (error) {
			console.error('Error deleting cell:', error);
		}
	}

	async function moveCellOnServer(cellId: string, direction: 'up' | 'down') {
		if (!notebookId || !notebookStore) return;

		console.log(`Attempting to move cell ${cellId} ${direction}`);

		// Get the server cell ID from the mapping
		const serverCellId = cellIdMapping.get(cellId);
		if (!serverCellId) {
			console.error('No server cell ID found for client cell ID:', cellId);
			return;
		}

		try {
			// Find the current position of the cell
			const currentPosition = notebookStore.notebook.cells.findIndex((cell) => cell.id === cellId);
			if (currentPosition === -1) {
				console.error('Cell not found in notebook:', cellId);
				return;
			}

			console.log(
				`Current position: ${currentPosition}, Total cells: ${notebookStore.notebook.cells.length}`
			);

			// Calculate new position
			let newPosition: number;
			if (direction === 'up') {
				newPosition = Math.max(0, currentPosition - 1);
			} else {
				newPosition = Math.min(notebookStore.notebook.cells.length - 1, currentPosition + 1);
			}

			console.log(`Calculated new position: ${newPosition}`);

			// Don't move if already at the boundary
			if (newPosition === currentPosition) {
				console.log('Cell already at boundary, no move needed');
				return;
			}

			console.log(`Sending move request: cellId=${serverCellId}, position=${newPosition}`);

			const response = await fetch(`/api/notebooks/${notebookId}/cells/${serverCellId}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ position: newPosition })
			});

			if (!response.ok) {
				throw new Error(`Failed to move cell: ${response.statusText}`);
			}

			console.log(`Cell moved ${direction} successfully, waiting for server event...`);
		} catch (error) {
			console.error('Error moving cell:', error);
		}
	}

	async function duplicateCellOnServer(cellId: string) {
		if (!notebookId) return;

		try {
			const response = await fetch(`/api/notebooks/${notebookId}/cells/${cellId}/duplicate`, {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error(`Failed to duplicate cell: ${response.statusText}`);
			}

			console.log('Cell duplicated successfully, waiting for server event...');
		} catch (error) {
			console.error('Error duplicating cell:', error);
		}
	}
</script>

<div class="notebook-page">
	{#if loading}
		<div class="loading-container">
			<div class="loading-spinner"></div>
			<p>Loading notebook...</p>
		</div>
	{:else if error}
		<div class="error-container">
			<h2>Error Loading Notebook</h2>
			<p>{error}</p>
			<button onclick={() => loadNotebook(notebookId!)}>Retry</button>
		</div>
	{:else if notebookStore}
		<TopBar
			title={notebookStore.notebook.title}
			on:titleChange={handleTitleChange}
			on:newNotebook={handleNewNotebook}
		/>

		<main class="notebook-main">
			<div class="notebook-container">
				<NotebookEditor
					{notebookStore}
					{addCellToServer}
					{updateCellOnServer}
					{deleteCellOnServer}
					{moveCellOnServer}
					{duplicateCellOnServer}
				/>
			</div>
		</main>
	{/if}

	<FooterBar />
</div>

<style>
	.notebook-page {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background-color: var(--color-white);
	}

	.notebook-main {
		flex: 1;
		overflow: auto;
	}

	.notebook-container {
		margin: 0 auto;
		max-width: var(--max-width);
	}

	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		flex: 1;
		padding: 2rem;
	}

	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 4px solid var(--color-gray-200);
		border-top: 4px solid var(--color-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.error-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		flex: 1;
		padding: 2rem;
		text-align: center;
	}

	.error-container h2 {
		color: var(--color-red-600);
		margin-bottom: 1rem;
	}

	.error-container button {
		margin-top: 1rem;
		padding: 0.5rem 1rem;
		background-color: var(--color-primary);
		color: white;
		border: none;
		border-radius: var(--border-radius);
		cursor: pointer;
	}

	.error-container button:hover {
		background-color: var(--color-primary-dark);
	}
</style>
