#!/usr/bin/env node

// Standalone WebSocket server for real-time collaboration
// This runs independently of the SvelteKit server

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { WebSocketServer } = require('ws');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const http = require('http');

const PORT = 3001;

// Create HTTP server for WebSocket upgrade
const server = http.createServer();

// Create WebSocket server
const wss = new WebSocketServer({
	server,
	path: '/'
});

// Store connections by notebook ID
const connections = new Map(); // notebookId -> Set<WebSocket>

console.log(`🚀 Starting WebSocket server on port ${PORT}...`);

wss.on('connection', (ws, request) => {
	try {
		const url = new URL(request.url, `http://${request.headers.host}`);
		const notebookId = url.searchParams.get('notebookId');

		if (!notebookId) {
			console.log('❌ Connection rejected: No notebook ID provided');
			ws.close(1008, 'Notebook ID required');
			return;
		}

		// Add to connections map
		if (!connections.has(notebookId)) {
			connections.set(notebookId, new Set());
		}
		connections.get(notebookId).add(ws);

		console.log(
			`✅ WebSocket connected for notebook: ${notebookId} (${connections.get(notebookId).size} total)`
		);

		// Send connection confirmation
		ws.send(
			JSON.stringify({
				type: 'connected',
				data: {
					notebookId,
					timestamp: Date.now()
				}
			})
		);

		// Handle messages from client
		ws.on('message', (data) => {
			try {
				const message = JSON.parse(data.toString());

				switch (message.type) {
					case 'ping':
						ws.send(
							JSON.stringify({
								type: 'pong',
								timestamp: Date.now()
							})
						);
						break;

					case 'client_ready':
						ws.send(
							JSON.stringify({
								type: 'server_ready',
								data: { notebookId }
							})
						);
						break;

					default:
						console.log(`📨 Received message from ${notebookId}:`, message.type);
				}
			} catch (error) {
				console.error('Error parsing message:', error);
			}
		});

		// Handle client disconnect
		ws.on('close', () => {
			const notebookConnections = connections.get(notebookId);
			if (notebookConnections) {
				notebookConnections.delete(ws);
				if (notebookConnections.size === 0) {
					connections.delete(notebookId);
				}
			}
			console.log(`❌ WebSocket disconnected for notebook: ${notebookId}`);
		});

		ws.on('error', (error) => {
			console.error(`WebSocket error for notebook ${notebookId}:`, error);
		});
	} catch (error) {
		console.error('Error setting up WebSocket connection:', error);
		ws.close(1011, 'Internal server error');
	}
});

// Broadcast function for external use
function broadcastToNotebook(notebookId, event) {
	const notebookConnections = connections.get(notebookId);
	if (!notebookConnections || notebookConnections.size === 0) {
		console.log(`📡 No connections for notebook ${notebookId}`);
		return;
	}

	const message = JSON.stringify(event);
	const deadConnections = [];

	notebookConnections.forEach((ws) => {
		if (ws.readyState === ws.OPEN) {
			try {
				ws.send(message);
				console.log(`📡 Broadcasted to notebook ${notebookId}: ${event.type}`);
			} catch (error) {
				console.error('Error sending message:', error);
				deadConnections.push(ws);
			}
		} else {
			deadConnections.push(ws);
		}
	});

	// Clean up dead connections
	deadConnections.forEach((ws) => notebookConnections.delete(ws));
}

// HTTP endpoint to receive broadcast requests from SvelteKit
server.on('request', (req, res) => {
	if (req.method === 'POST' && req.url === '/broadcast') {
		let body = '';

		req.on('data', (chunk) => {
			body += chunk.toString();
		});

		req.on('end', () => {
			try {
				const { notebookId, event } = JSON.parse(body);
				broadcastToNotebook(notebookId, event);

				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ success: true }));
			} catch (error) {
				console.error('Error processing broadcast request:', error);
				res.writeHead(400, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ error: 'Invalid request' }));
			}
		});
	} else {
		res.writeHead(404, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Not found' }));
	}
});

// Start server
server.listen(PORT, () => {
	console.log(`✅ WebSocket server running on ws://localhost:${PORT}`);
	console.log(`📡 Broadcast endpoint: http://localhost:${PORT}/broadcast`);
});

// Graceful shutdown
process.on('SIGINT', () => {
	console.log('\n🛑 Shutting down WebSocket server...');
	server.close(() => {
		console.log('✅ WebSocket server stopped');
		process.exit(0);
	});
});
