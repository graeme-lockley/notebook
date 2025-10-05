<script lang="ts">
	import TopBar from '$lib/components/TopBar.svelte';
	import FooterBar from '$lib/components/FooterBar.svelte';
	import NotebookEditor from '$lib/components/NotebookEditor.svelte';
	import { createNotebookStore, type NotebookStore } from '$lib/client/stores/notebook';
	import { ReactiveNotebook } from '$lib/client/model/cell';
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import type { CellKind } from '$lib/server/domain/value-objects/CellKind';
	import { logger } from '$lib/common/infrastructure/logging/logger.service';
	import { serverIdToClientId } from '$lib/client/model/cell';
	import * as ServerCommand from '$lib/client/server/server-commands';
	import * as ServerQuery from '$lib/client/server/server-queries';

	logger.configure({ enableInfo: true });

	let notebookStore: NotebookStore | undefined;
	let loading = true;
	let error: string | null = null;
	let websocket: WebSocket | null = null;
	let reconnectAttempts = 0;
	let maxReconnectAttempts = 5;
	let reconnectDelay = 1000; // Start with 1 second
	let lastProcessedEventId: string | null = null; // Track the last processed event ID
	let isReloading = false; // Track if we're currently reloading to prevent interference
	// let reloadTimeout: NodeJS.Timeout | null = null; // Debounce reload requests - no longer needed

	// Get the notebookId from the URL parameters
	$: notebookId = $page.params.notebookId;

	// Protect notebook store from reactive updates during reload
	$: if (notebookStore && !isReloading) {
		// This reactive statement ensures the notebook store is only updated when not reloading
		logger.info('📊 Notebook store updated, cells:', notebookStore.notebook?.cells?.length || 0);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	$: (globalThis as any).notebookStore = notebookStore;

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
		logger.info('🚀 Notebook page mounted for:', notebookId);
		if (notebookId) {
			await loadNotebook(notebookId);
		}
	});

	// Add global error handler to catch any unhandled errors
	if (typeof window !== 'undefined') {
		window.addEventListener('error', (event) => {
			logger.error('❌ Global error caught:', event.error);
		});

		window.addEventListener('unhandledrejection', (event) => {
			logger.error('❌ Unhandled promise rejection:', event.reason);
		});
	}

	async function loadNotebook(id: string) {
		try {
			loading = true;
			error = null;

			const notebookData = await ServerQuery.getNotebook(id);

			// Create a new notebook with the fetched data
			const notebook = new ReactiveNotebook({
				title: notebookData.title,
				description: notebookData.description || ''
			});

			// Add all cells from the API response to the notebook
			for (const cellData of notebookData.cells) {
				await notebook.addCell({
					id: cellData.id,
					kind: cellData.kind,
					value: cellData.value,
					focus: false // Don't focus on loaded cells
				});
			}

			notebookStore = createNotebookStore(notebook);

			// Set up WebSocket connection for real-time updates
			if (notebookId) {
				setupWebSocketConnection(notebookId);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load notebook';
			logger.error('Error loading notebook:', err);
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
			logger.info('WebSocket connected');
			reconnectAttempts = 0;
			reconnectDelay = 1000;

			// Send initial ping and ready signal
			websocket?.send(JSON.stringify({ type: 'ping' }));
			websocket?.send(JSON.stringify({ type: 'client_ready', data: { notebookId } }));
		};

		websocket.onmessage = async (event) => {
			try {
				const data = JSON.parse(event.data);
				logger.info('🔌 WebSocket message received:', data);
				await handleWebSocketMessage(data);
			} catch (err) {
				logger.error('Error parsing WebSocket message:', err);
			}
		};

		websocket.onclose = (event) => {
			logger.info('WebSocket disconnected:', event.code, event.reason);
			attemptReconnect(notebookId);
		};

		websocket.onerror = (error) => {
			logger.error('WebSocket error:', error);
		};
	}

	async function handleWebSocketMessage(data: unknown) {
		// Type guard to ensure data is an object with a type property
		if (typeof data !== 'object' || data === null || !('type' in data)) {
			logger.error('Invalid WebSocket message format:', data);
			return;
		}

		const message = data as { type: string; data?: unknown; payload?: unknown; eventId?: string };

		switch (message.type) {
			case 'connected':
				logger.info('WebSocket connection confirmed for notebook:', message.data);
				break;
			case 'pong':
				// Handle heartbeat response
				logger.info('WebSocket heartbeat received');
				break;
			case 'server_ready':
				logger.info('Server ready for notebook:', message.data);
				break;
			case 'cell.created':
			case 'cell.updated':
			case 'cell.deleted':
			case 'cell.moved':
				// Handle cell events
				logger.info('📨 Received WebSocket cell event:', message.type, message.payload);
				await handleCellEvent(message);
				break;
			case 'notebook.updated':
			case 'notebook.initialized':
				// Use existing event handling logic
				logger.info('📨 Received WebSocket event:', message.type, message.data);
				await handleServerEvent(data);
				break;
			default:
				logger.info('Unknown WebSocket message type:', message.type);
		}
	}

	async function handleCellEvent(message: { type: string; payload?: unknown; eventId?: string }) {
		logger.info('🎯 Handling cell event:', message.type, message.payload);

		if (!notebookStore || !notebookStore.notebook) {
			logger.error('❌ No notebookStore or notebook instance available for cell event');
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

				logger.info(`➕ Adding cell ${cellId} at position ${position}`);

				// Use the store's addCell method to trigger reactivity
				await notebookStore.addCell({
					id: cellId,
					kind,
					value,
					position
				});
				break;
			}
			case 'cell.updated': {
				const serverCellId = payload.cellId as string;
				const changes = payload.changes as { kind?: CellKind; value?: string };

				logger.info(`✏️ Updating cell ${serverCellId}:`, changes);

				// Find the client ID that maps to this server ID
				let clientCellId = serverIdToClientId(serverCellId);

				// Use the store's updateCell method to trigger reactivity
				notebookStore.updateCell(clientCellId, changes);
				break;
			}
			case 'cell.deleted': {
				const serverCellId = payload.cellId as string;

				logger.info(`🗑️ Deleting cell ${serverCellId}`);
				logger.info(
					`🔍 Current cells before deletion:`,
					notebookStore.notebook.cells.map((c) => c.id)
				);

				// Find the client ID that maps to this server ID
				let clientCellId = serverIdToClientId(serverCellId);

				// Use the store's removeCell method to trigger reactivity
				const result = notebookStore.removeCell(clientCellId);
				logger.info(`🔍 Remove cell result:`, result);
				logger.info(
					`🔍 Current cells after deletion:`,
					notebookStore.notebook.cells.map((c) => c.id)
				);
				break;
			}
			case 'cell.moved': {
				const serverCellId = payload.cellId as string;
				const position = payload.position as number;

				logger.info(`↕️ Moving cell ${serverCellId} to position ${position}`);

				// Find the client ID that maps to this server ID
				let clientCellId = serverIdToClientId(serverCellId);

				// Move cell and trigger reactivity
				notebookStore.moveCell(clientCellId, position);
				break;
			}
		}

		logger.info(
			'✅ Cell event handled directly, current cells:',
			notebookStore.notebook.cells.length
		);
	}

	function attemptReconnect(notebookId: string) {
		if (reconnectAttempts < maxReconnectAttempts) {
			reconnectAttempts++;
			logger.info(
				`Attempting to reconnect WebSocket (${reconnectAttempts}/${maxReconnectAttempts})...`
			);

			setTimeout(() => {
				setupWebSocketConnection(notebookId);
			}, reconnectDelay);

			// Exponential backoff
			reconnectDelay = Math.min(reconnectDelay * 2, 30000);
		} else {
			logger.error('Max reconnection attempts reached');
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async function handleServerEvent(eventData: any) {
		if (!notebookStore) return;

		switch (eventData.type) {
			case 'notebook.initialized': {
				// Initial data - cells are already loaded from the API
				logger.info('Notebook initialized with', eventData.data.cells.length, 'cells');
				break;
			}
			case 'notebook.updated': {
				// Update cells from server
				const eventId = eventData.data.event?.id;
				logger.info('Received notebook.updated event:', eventData.data.event);

				if (eventId && isEventNewer(eventId)) {
					logger.info('Processing newer event:', eventId);
					await updateCellsFromServer(eventData.data.cells);
					lastProcessedEventId = eventId;
				} else {
					logger.info('Skipping older event:', eventId, 'last processed:', lastProcessedEventId);
				}
				break;
			}
			case 'heartbeat': {
				// Just a heartbeat to keep connection alive
				logger.info('Event stream heartbeat received');
				break;
			}
			default:
				logger.info('Unknown event type:', eventData.type);
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async function updateCellsFromServer(serverCells: any[]) {
		if (!notebookStore) return;

		logger.info('🔄 Updating cells from server:', serverCells.length, 'cells');
		logger.info('📋 Current cells:', notebookStore.notebook.cells.length);

		// Simple approach: clear all cells and rebuild from server
		const currentCells = [...notebookStore.notebook.cells];

		// Remove all current cells
		currentCells.forEach((cell) => {
			notebookStore?.notebook.removeCell(cell.id);
		});

		// Add all cells from server
		serverCells.forEach(async (serverCell) => {
			logger.info(
				'➕ Adding cell from server:',
				serverCell.id,
				'kind:',
				serverCell.kind,
				'value:',
				serverCell.value.substring(0, 50)
			);

			await notebookStore?.notebook.addCell({
				id: serverCell.id,
				kind: serverCell.kind,
				value: serverCell.value,
				focus: false
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
		logger.info('Creating new notebook:', { name, description });
		// The TopBar component will handle the API call and navigation
	}

	async function handleAddCellToServer(kind: CellKind, value: string, position: number) {
		await ServerCommand.addCell(notebookId, kind, value, position);
	}

	async function handleUpdateCellOnServer(
		cellId: string,
		updates: { kind?: string; value?: string }
	) {
		await ServerCommand.updateCell(notebookId, cellId, updates);
	}

	async function handleDeleteCellOnServer(cellId: string) {
		await ServerCommand.deleteCell(notebookId, cellId);
	}

	async function handleMoveCellOnServer(cellId: string, direction: 'up' | 'down') {
		if (!notebookId || !notebookStore) return;

		// Find the current position of the cell
		const currentPosition = notebookStore.findCellIndex(cellId);
		if (currentPosition === -1) {
			logger.error('Cell not found in notebook:', cellId);
			return;
		}

		// Calculate new position
		let newPosition: number;
		if (direction === 'up') {
			newPosition = Math.max(0, currentPosition - 1);
		} else {
			newPosition = Math.min(notebookStore.length() - 1, currentPosition + 1);
		}

		if (newPosition === currentPosition) {
			// Cell already at boundary, no move needed
			return;
		}

		await ServerCommand.moveCell(notebookId, cellId, newPosition);
	}

	async function handleDuplicateCellOnServer(cellId: string) {
		await ServerCommand.duplicateCell(notebookId, cellId);
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
					{handleAddCellToServer}
					{handleUpdateCellOnServer}
					{handleDeleteCellOnServer}
					{handleMoveCellOnServer}
					{handleDuplicateCellOnServer}
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
