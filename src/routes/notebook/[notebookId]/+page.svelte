<script lang="ts">
	import TopBar from '$lib/components/TopBar.svelte';
	import FooterBar from '$lib/components/FooterBar.svelte';
	import NotebookEditor from '$lib/components/NotebookEditor.svelte';
	import type { NotebookStore } from '$lib/client/stores/notebook';
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import type { CellKind } from '$lib/server/domain/value-objects/CellKind';
	import { logger } from '$lib/common/infrastructure/logging/logger.service';
	import type { PageData } from './$types';

	// Services
	import { WebSocketConnectionService } from '$lib/client/services/websocket-connection.service';
	import { WebSocketMessageHandler } from '$lib/client/services/websocket-message-handler';
	import { NotebookSyncService } from '$lib/client/services/notebook-sync.service';
	import { NotebookLoaderService } from '$lib/client/services/notebook-loader.service';
	import { NotebookCommandService } from '$lib/client/services/notebook-command.service';
	import * as ServerCommand from '$lib/client/server/server-commands';

	logger.configure({ enableInfo: true });

	// Get page data including authentication context
	let { data }: { data: PageData } = $props();

	// Use the data to avoid unused variable warning
	$effect(() => {
		logger.debug('Notebook page data:', {
			notebookId: data.notebookId,
			user: data.user?.name || 'null'
		});
	});

	// UI State
	let notebookStore = $state<NotebookStore | undefined>(undefined);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Reactive values for notebook metadata
	let notebookTitle = $derived(notebookStore?.notebook.title ?? 'Untitled');
	let notebookDescription = $derived(notebookStore?.notebook.description ?? '');
	let notebookVisibility = $derived(notebookStore?.notebook.visibility ?? 'public');

	// Services (initialized when needed)
	let wsConnection = $state<WebSocketConnectionService | undefined>(undefined);
	let wsMessageHandler = $state<WebSocketMessageHandler | undefined>(undefined);
	let syncService = $state<NotebookSyncService | undefined>(undefined);
	let loaderService = $state<NotebookLoaderService | undefined>(undefined);
	let commandService = $state<NotebookCommandService | undefined>(undefined);

	// Get the notebookId from the URL parameters
	let notebookId = $derived($page.params.notebookId);
	let previousNotebookId = $state<string | undefined>(undefined);

	// Expose notebook store for debugging
	$effect(() => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(globalThis as any).notebookStore = notebookStore;
	});

	// Watch for notebookId changes and re-initialize when it changes
	$effect(() => {
		const currentNotebookId = notebookId;

		// If notebookId changed, clean up old connection and load new notebook
		if (currentNotebookId && currentNotebookId !== previousNotebookId) {
			logger.info(`🚀 Notebook ID changed: ${previousNotebookId} -> ${currentNotebookId}`);

			// Clean up previous WebSocket connection if it exists
			if (previousNotebookId && wsConnection) {
				logger.info(`🔌 Disconnecting from previous notebook: ${previousNotebookId}`);
				try {
					wsConnection.disconnect();
				} catch (err) {
					logger.warn('Error disconnecting previous WebSocket:', err);
				}
				wsConnection = undefined;
			}

			// Reset services
			wsMessageHandler = undefined;
			syncService = undefined;
			loaderService = undefined;
			commandService = undefined;

			// Reset state
			notebookStore = undefined;
			loading = true;
			error = null;

			// Update previous ID
			previousNotebookId = currentNotebookId;

			// Initialize new notebook (async operation)
			void initializeNotebook();
		}
	});

	onMount(async () => {
		logger.info('🚀 Notebook page mounted for:', notebookId);
		if (notebookId) {
			previousNotebookId = notebookId;
			await initializeNotebook();
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

	async function initializeNotebook() {
		if (!notebookId) {
			error = 'Notebook ID is required';
			loading = false;
			return;
		}

		try {
			loading = true;
			error = null;

			logger.info(`📚 Initializing notebook: ${notebookId}`);

			// Initialize loader service and load notebook
			loaderService = new NotebookLoaderService();
			const result = await loaderService.loadNotebook(notebookId);
			notebookStore = result.store;

			// Initialize sync service
			syncService = new NotebookSyncService(notebookStore);

			// Initialize command service
			commandService = new NotebookCommandService(notebookId, notebookStore);

			// Setup WebSocket connection
			wsConnection = new WebSocketConnectionService();
			wsMessageHandler = new WebSocketMessageHandler();

			// Register message handlers
			registerWebSocketHandlers();

			// Connect WebSocket and start receiving messages
			wsConnection.onMessage((data) => {
				if (wsMessageHandler) {
					wsMessageHandler.handleMessage(data);
				}
			});
			wsConnection.connect(notebookId);

			logger.info(`✅ Notebook initialized successfully: ${notebookId}`);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load notebook';
			logger.error('❌ Error initializing notebook:', err);
		} finally {
			loading = false;
		}
	}

	/**
	 * Registers handlers for different WebSocket message types
	 */
	function registerWebSocketHandlers() {
		if (!wsMessageHandler || !syncService) {
			logger.error('Cannot register WebSocket handlers: services not initialized');
			return;
		}

		// Store syncService reference for use in handlers (TypeScript narrowing)
		const currentSyncService = syncService;

		// Handle cell events
		wsMessageHandler.registerHandler('cell.created', (msg) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			currentSyncService.handleCellCreated(msg.payload as any);
		});
		wsMessageHandler.registerHandler('cell.updated', (msg) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			currentSyncService.handleCellUpdated(msg.payload as any);
		});
		wsMessageHandler.registerHandler('cell.deleted', (msg) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			currentSyncService.handleCellDeleted(msg.payload as any);
		});
		wsMessageHandler.registerHandler('cell.moved', (msg) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			currentSyncService.handleCellMoved(msg.payload as any);
		});

		// Handle notebook events
		wsMessageHandler.registerHandler('notebook.updated', (msg) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			currentSyncService.handleNotebookUpdated(msg.payload as any);
		});
		wsMessageHandler.registerHandler('notebook.initialized', (msg) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			currentSyncService.handleNotebookInitialized(msg.data as any);
		});

		// Handle connection events
		wsMessageHandler.registerHandler('connected', (msg) => {
			logger.info('WebSocket connection confirmed for notebook:', msg.data);
		});
		wsMessageHandler.registerHandler('pong', () => {
			logger.info('WebSocket heartbeat received');
		});
		wsMessageHandler.registerHandler('server_ready', (msg) => {
			logger.info('Server ready for notebook:', msg.data);
		});
		wsMessageHandler.registerHandler('heartbeat', () => {
			logger.info('Event stream heartbeat received');
		});
	}

	onDestroy(() => {
		if (wsConnection) {
			logger.info('🧹 Cleaning up WebSocket connection on component destroy');
			try {
				wsConnection.disconnect();
			} catch (err) {
				logger.warn('Error disconnecting WebSocket on destroy:', err);
			}
		}
	});

	function handleNewNotebook(event: CustomEvent) {
		// Handle new notebook creation - redirect to the new notebook
		const { name, description } = event.detail;
		logger.info('Creating new notebook:', { name, description });
		// The TopBar component will handle the API call and navigation
	}

	async function handleUpdateNotebook(event: CustomEvent) {
		if (!notebookId || !commandService) return;

		const { title, description, visibility } = event.detail;
		logger.info('Updating notebook:', { title, description, visibility });

		try {
			await ServerCommand.updateNotebook(notebookId, { title, description, visibility });
			logger.info('Notebook updated successfully');
			// WebSocket will sync the change back to the store
		} catch (error) {
			logger.error('Error updating notebook:', error);
			// You might want to show an error message to the user here
		}
	}

	async function handleAddCellToServer(kind: CellKind, value: string, position: number) {
		if (!commandService) return;
		await commandService.addCell(kind, value, position);
	}

	async function handleUpdateCellOnServer(
		cellId: string,
		updates: { kind?: string; value?: string }
	) {
		if (!commandService) return;
		await commandService.updateCell(cellId, updates);
	}

	async function handleDeleteCellOnServer(cellId: string) {
		if (!commandService) return;
		await commandService.deleteCell(cellId);
	}

	async function handleMoveCellOnServer(cellId: string, direction: 'up' | 'down') {
		if (!commandService) return;
		await commandService.moveCell(cellId, direction);
	}

	async function handleDuplicateCellOnServer(cellId: string) {
		if (!commandService) return;
		await commandService.duplicateCell(cellId);
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
			<button onclick={() => initializeNotebook()}>Retry</button>
		</div>
	{:else if notebookStore}
		<TopBar
			title={notebookTitle}
			description={notebookDescription}
			visibility={notebookVisibility}
			user={data.user
				? {
						...data.user,
						createdAt: new Date(data.user.createdAt),
						lastLoginAt: new Date(data.user.lastLoginAt)
					}
				: null}
			isAuthenticated={data.isAuthenticated}
			on:newNotebook={handleNewNotebook}
			on:updateNotebook={handleUpdateNotebook}
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
