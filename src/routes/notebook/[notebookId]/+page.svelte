<script lang="ts">
	import TopBar from '$lib/components/TopBar.svelte';
	import FooterBar from '$lib/components/FooterBar.svelte';
	import NotebookEditor from '$lib/components/NotebookEditor.svelte';
	import { createNotebookStore, type NotebookStore } from '$lib/stores/notebook';
	import { ReactiveNotebook } from '$lib/model/cell';
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { SvelteMap } from 'svelte/reactivity';
	import type { CellKind } from '$lib/server/domain/value-objects/CellKind';

	let notebookStore: NotebookStore | undefined;
	let loading = true;
	let error: string | null = null;
	let websocket: WebSocket | null = null;
	let reconnectAttempts = 0;
	let maxReconnectAttempts = 5;
	let reconnectDelay = 1000; // Start with 1 second
	let cellIdMapping: Map<string, string> = new SvelteMap(); // Maps client cell IDs to server cell IDs
	let lastProcessedEventId: string | null = null; // Track the last processed event ID
	let isReloading = false; // Track if we're currently reloading to prevent interference
	// let reloadTimeout: NodeJS.Timeout | null = null; // Debounce reload requests - no longer needed

	// Get the notebookId from the URL parameters
	$: notebookId = $page.params.notebookId;

	// Protect notebook store from reactive updates during reload
	$: if (notebookStore && !isReloading) {
		// This reactive statement ensures the notebook store is only updated when not reloading
		console.log('📊 Notebook store updated, cells:', notebookStore.notebook?.cells?.length || 0);
	}

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
		console.log('🚀 Notebook page mounted for:', notebookId);
		if (notebookId) {
			await loadNotebook(notebookId);
		}
	});

	// Add global error handler to catch any unhandled errors
	if (typeof window !== 'undefined') {
		window.addEventListener('error', (event) => {
			console.error('❌ Global error caught:', event.error);
		});

		window.addEventListener('unhandledrejection', (event) => {
			console.error('❌ Unhandled promise rejection:', event.reason);
		});

		// Add mouse movement debugging with debounce
		let mouseMoveCount = 0;
		let mouseMoveTimeout: NodeJS.Timeout | null = null;
		window.addEventListener('mousemove', () => {
			mouseMoveCount++;

			// Clear existing timeout
			if (mouseMoveTimeout) {
				clearTimeout(mouseMoveTimeout);
			}

			// Debounce mouse movement logging
			mouseMoveTimeout = setTimeout(() => {
				if (mouseMoveCount % 10 === 0) {
					// Log every 10th mouse move to avoid spam
					console.log('🖱️ Mouse moved, count:', mouseMoveCount, 'isReloading:', isReloading);
				}
			}, 50); // 50ms debounce
		});

		// Add mouse enter/leave debugging for the notebook container
		document.addEventListener('DOMContentLoaded', () => {
			const notebookContainer = document.querySelector('[data-testid="notebook-editor"]');
			if (notebookContainer) {
				notebookContainer.addEventListener('mouseenter', () => {
					console.log('🖱️ Mouse entered notebook container');
				});
				notebookContainer.addEventListener('mouseleave', () => {
					console.log('🖱️ Mouse left notebook container');
				});
			}
		});
	}

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

			// Set up WebSocket connection for real-time updates
			if (notebookId) {
				setupWebSocketConnection(notebookId);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load notebook';
			console.error('Error loading notebook:', err);
		} finally {
			loading = false;
		}
	}

	function setupWebSocketConnection(notebookId: string) {
		if (websocket) {
			websocket.close();
		}

		// Use WebSocket URL with notebook ID as query parameter
		const wsUrl = `ws://localhost:3001?notebookId=${notebookId}`;
		websocket = new WebSocket(wsUrl);

		websocket.onopen = () => {
			console.log('WebSocket connected');
			reconnectAttempts = 0;
			reconnectDelay = 1000;

			// Send initial ping and ready signal
			websocket?.send(JSON.stringify({ type: 'ping' }));
			websocket?.send(JSON.stringify({ type: 'client_ready', data: { notebookId } }));
		};

		websocket.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				console.log('🔌 WebSocket message received:', data);
				handleWebSocketMessage(data);
			} catch (err) {
				console.error('Error parsing WebSocket message:', err);
			}
		};

		websocket.onclose = (event) => {
			console.log('WebSocket disconnected:', event.code, event.reason);
			attemptReconnect(notebookId);
		};

		websocket.onerror = (error) => {
			console.error('WebSocket error:', error);
		};
	}

	function handleWebSocketMessage(data: unknown) {
		// Type guard to ensure data is an object with a type property
		if (typeof data !== 'object' || data === null || !('type' in data)) {
			console.error('Invalid WebSocket message format:', data);
			return;
		}

		const message = data as { type: string; data?: unknown; payload?: unknown; eventId?: string };

		switch (message.type) {
			case 'connected':
				console.log('WebSocket connection confirmed for notebook:', message.data);
				break;
			case 'pong':
				// Handle heartbeat response
				console.log('WebSocket heartbeat received');
				break;
			case 'server_ready':
				console.log('Server ready for notebook:', message.data);
				break;
			case 'cell.created':
			case 'cell.updated':
			case 'cell.deleted':
			case 'cell.moved':
				// Handle cell events
				console.log('📨 Received WebSocket cell event:', message.type, message.payload);
				handleCellEvent(message);
				break;
			case 'notebook.updated':
			case 'notebook.initialized':
				// Use existing event handling logic
				console.log('📨 Received WebSocket event:', message.type, message.data);
				handleServerEvent(data);
				break;
			default:
				console.log('Unknown WebSocket message type:', message.type);
		}
	}

	function handleCellEvent(message: { type: string; payload?: unknown; eventId?: string }) {
		console.log('🎯 Handling cell event:', message.type, message.payload);

		if (!notebookStore || !notebookStore.notebook) {
			console.error('❌ No notebookStore or notebook instance available for cell event');
			return;
		}

		const payload = message.payload as Record<string, unknown>;

		switch (message.type) {
			case 'cell.created': {
				const cellId = payload.cellId as string;
				const kind = payload.kind as CellKind;
				const value = payload.value as string;
				const position = payload.position as number;
				// const createdAt = payload.createdAt as string; // Not used in current implementation

				console.log(`➕ Adding cell ${cellId} at position ${position}`);

				// Use the store's addCell method to trigger reactivity
				notebookStore
					.addCell({
						kind,
						value
					})
					.then(() => {
						if (!notebookStore) {
							console.error('❌ No notebookStore available for cell mapping');
							return;
						}

						// Get the last added cell (which should be the new one)
						const newCell = notebookStore.notebook.cells[notebookStore.notebook.cells.length - 1];

						// Update the cell ID mapping: client ID -> server ID
						// The newCell.id is the client-generated ID, cellId is the server ID
						cellIdMapping.set(newCell.id, cellId);
						console.log(`🔗 Mapped client ID ${newCell.id} to server ID ${cellId}`);

						// Move the cell to the correct position if needed
						if (position !== notebookStore.notebook.cells.length - 1) {
							notebookStore.notebook.moveCell(
								notebookStore.notebook.cells[notebookStore.notebook.cells.length - 1].id,
								position
							);
							// Trigger reactivity after moving
							notebookStore.set(notebookStore.notebook);
						}
					});
				break;
			}
			case 'cell.updated': {
				const serverCellId = payload.cellId as string;
				const changes = payload.changes as { kind?: CellKind; value?: string };

				console.log(`✏️ Updating cell ${serverCellId}:`, changes);

				// Find the client ID that maps to this server ID
				let clientCellId = serverCellId;
				for (const [clientId, serverId] of cellIdMapping.entries()) {
					if (serverId === serverCellId) {
						clientCellId = clientId;
						console.log(`🔗 Found client ID ${clientCellId} for server ID ${serverCellId}`);
						break;
					}
				}

				// Use the store's updateCell method to trigger reactivity
				notebookStore.updateCell(clientCellId, changes);
				break;
			}
			case 'cell.deleted': {
				const serverCellId = payload.cellId as string;

				console.log(`🗑️ Deleting cell ${serverCellId}`);
				console.log(
					`🔍 Current cells before deletion:`,
					notebookStore.notebook.cells.map((c) => c.id)
				);

				// Find the client ID that maps to this server ID
				let clientCellId = serverCellId;
				for (const [clientId, serverId] of cellIdMapping.entries()) {
					if (serverId === serverCellId) {
						clientCellId = clientId;
						console.log(`🔗 Found client ID ${clientCellId} for server ID ${serverCellId}`);
						break;
					}
				}

				// Use the store's removeCell method to trigger reactivity
				const result = notebookStore.removeCell(clientCellId);
				console.log(`🔍 Remove cell result:`, result);
				console.log(
					`🔍 Current cells after deletion:`,
					notebookStore.notebook.cells.map((c) => c.id)
				);

				// Clean up the mapping
				cellIdMapping.delete(clientCellId);
				console.log(`🧹 Cleaned up mapping for client ID ${clientCellId}`);
				break;
			}
			case 'cell.moved': {
				const serverCellId = payload.cellId as string;
				const position = payload.position as number;

				console.log(`↕️ Moving cell ${serverCellId} to position ${position}`);

				// Find the client ID that maps to this server ID
				let clientCellId = serverCellId;
				for (const [clientId, serverId] of cellIdMapping.entries()) {
					if (serverId === serverCellId) {
						clientCellId = clientId;
						console.log(`🔗 Found client ID ${clientCellId} for server ID ${serverCellId}`);
						break;
					}
				}

				// Move cell and trigger reactivity
				notebookStore.notebook.moveCell(clientCellId, position);
				notebookStore.set(notebookStore.notebook);
				break;
			}
		}

		console.log(
			'✅ Cell event handled directly, current cells:',
			notebookStore.notebook.cells.length
		);
	}

	// reloadNotebook and performReload functions removed - we now use direct cell manipulation instead of full reloads

	function attemptReconnect(notebookId: string) {
		if (reconnectAttempts < maxReconnectAttempts) {
			reconnectAttempts++;
			console.log(
				`Attempting to reconnect WebSocket (${reconnectAttempts}/${maxReconnectAttempts})...`
			);

			setTimeout(() => {
				setupWebSocketConnection(notebookId);
			}, reconnectDelay);

			// Exponential backoff
			reconnectDelay = Math.min(reconnectDelay * 2, 30000);
		} else {
			console.error('Max reconnection attempts reached');
		}
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

		console.log('🔄 Updating cells from server:', serverCells.length, 'cells');
		console.log('📊 Current cell mapping:', Array.from(cellIdMapping.entries()));
		console.log('📋 Current cells:', notebookStore.notebook.cells.length);

		// Simple approach: clear all cells and rebuild from server
		const currentCells = [...notebookStore.notebook.cells];

		// Remove all current cells
		currentCells.forEach((cell) => {
			notebookStore?.notebook.removeCell(cell.id);
		});

		// Clear the mapping
		cellIdMapping.clear();

		// Add all cells from server
		serverCells.forEach((serverCell) => {
			console.log(
				'➕ Adding cell from server:',
				serverCell.id,
				'kind:',
				serverCell.kind,
				'value:',
				serverCell.value.substring(0, 50)
			);

			notebookStore?.notebook
				.addCell({
					kind: serverCell.kind,
					value: serverCell.value,
					focus: false
				})
				.then((clientCell) => {
					// Map the new client cell ID to the server cell ID
					cellIdMapping.set(clientCell.id, serverCell.id);
					console.log('🔗 Mapped cell:', clientCell.id, '->', serverCell.id);
				});
		});
	}

	onDestroy(() => {
		if (websocket) {
			websocket.close();
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

	async function addCellToServer(kind: CellKind, value: string, position: number) {
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
