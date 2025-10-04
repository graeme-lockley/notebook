# Sequential Refactoring Plan for ObservableHQ Clone

## Overview

This document outlines a 5-phase refactoring plan to transform the current complex event flow into a clean, efficient, event-driven architecture following clean architecture principles.

## Current Architecture Issues

- Complex multi-hop event flow with 7+ roundtrips
- Clean architecture violations with domain services handling infrastructure concerns
- Performance bottlenecks from polling and redundant processing
- Scalability limitations with single-threaded processing

## Phase 1: Domain Layer Cleanup

**Goal**: Remove infrastructure dependencies from domain services

### What to do:

1. **Extract WebSocket broadcasting from domain services**
   - Remove `StandaloneWebSocketBroadcaster` dependency from `NotebookServiceImpl`
   - Move broadcasting logic to application layer

2. **Create pure domain events**
   - Ensure domain events contain only business data
   - Remove infrastructure-specific fields

3. **Separate business logic from orchestration**
   - Keep only pure business logic in domain services
   - Move event publishing to application layer

### Files to modify:

- `src/lib/server/domain/domain-services/notebook.service.impl.ts`
- `src/lib/server/domain/domain-services/library.service.impl.ts`
- `src/lib/server/domain/events/notebook.events.ts`

### Benefits:

- Domain layer becomes pure business logic
- Easier to test domain services
- Clear separation of concerns

### Detailed Prompt for Phase 1:

```
Please refactor the domain layer to remove infrastructure dependencies and create pure business logic.

Specifically:
1. Remove the StandaloneWebSocketBroadcaster dependency from NotebookServiceImpl and LibraryServiceImpl
2. Remove all WebSocket broadcasting calls from domain services (broadcastCustomEvent, broadcastToNotebook, etc.)
3. Ensure domain events contain only business data - no infrastructure-specific fields
4. Keep only pure business logic in domain services - no event publishing, no external service calls
5. Move event publishing responsibility to the application layer (we'll handle this in Phase 2)
6. Update the domain services to return domain events instead of publishing them directly
7. Ensure all domain services are testable in isolation without external dependencies

The goal is to have domain services that only contain business logic and return domain events, with no knowledge of infrastructure concerns like WebSocket broadcasting or event publishing.
```

---

## Phase 2: Command Handlers Implementation

**Goal**: Implement CQRS command side with proper separation

### What to do:

1. **Create command handlers**
   - `AddCellCommandHandler`
   - `UpdateCellCommandHandler`
   - `DeleteCellCommandHandler`
   - `MoveCellCommandHandler`

2. **Implement command objects**
   - Create command DTOs for each operation
   - Add validation to commands

3. **Refactor API routes to use command handlers**
   - Replace direct service calls with command handlers
   - Maintain existing API contracts

### Files to create:

- `src/lib/server/application/commands/`
- `src/lib/server/application/handlers/`
- `src/lib/server/application/ports/inbound/command-handler.ts`

### Files to modify:

- `src/routes/api/notebooks/[notebookId]/cells/+server.ts`
- `src/routes/api/notebooks/[notebookId]/+server.ts`

### Benefits:

- Clear separation of write operations
- Better validation and error handling
- Easier to add new features

### Detailed Prompt for Phase 2:

```
Please implement the CQRS command side by creating command handlers and refactoring API routes to use them.

Specifically:
1. Create command DTOs for each operation:
   - AddCellCommand (kind, value, position, notebookId)
   - UpdateCellCommand (cellId, updates, notebookId)
   - DeleteCellCommand (cellId, notebookId)
   - MoveCellCommand (cellId, position, notebookId)

2. Create command handlers for each operation:
   - AddCellCommandHandler
   - UpdateCellCommandHandler
   - DeleteCellCommandHandler
   - MoveCellCommandHandler

3. Each command handler should:
   - Validate the command
   - Call the appropriate domain service method
   - Publish the resulting domain event to the event store
   - Handle errors appropriately

4. Refactor the API routes to use command handlers instead of direct service calls:
   - POST /api/notebooks/[notebookId]/cells should use AddCellCommandHandler
   - PUT /api/notebooks/[notebookId]/cells/[cellId] should use UpdateCellCommandHandler
   - DELETE /api/notebooks/[notebookId]/cells/[cellId] should use DeleteCellCommandHandler
   - PATCH /api/notebooks/[notebookId]/cells/[cellId]/move should use MoveCellCommandHandler

5. Maintain the existing API contracts and response formats
6. Add proper error handling and validation
7. Ensure command handlers are testable in isolation

The goal is to have a clear separation between API routes (presentation), command handlers (application), and domain services (domain), with proper event publishing handled by the application layer.
```

---

## Phase 3: Event Projectors Implementation

**Goal**: Create read model projections and decouple event processing

### What to do:

1. **Create event projectors**
   - `NotebookProjector` for notebook state
   - `CellProjector` for cell state
   - `LibraryProjector` for library state

2. **Implement read models**
   - Create read model interfaces
   - Implement in-memory read models initially
   - Add persistence later

3. **Create event bus**
   - Simple event bus for decoupling
   - Register projectors with event bus

### Files to create:

- `src/lib/server/application/projectors/`
- `src/lib/server/application/read-models/`
- `src/lib/server/application/event-bus/`

### Files to modify:

- `src/lib/server/domain/domain-services/notebook.service.impl.ts`
- `src/lib/server/domain/domain-services/library.service.impl.ts`

### Benefits:

- Decoupled event processing
- Better performance for reads
- Easier to add new projections

### Detailed Prompt for Phase 3:

```
Please implement event projectors and read models to decouple event processing and improve read performance.

Specifically:
1. Create an event bus interface and implementation:
   - EventBus interface with subscribe/publish methods
   - SimpleEventBus implementation using in-memory event handling
   - Support for registering multiple projectors

2. Create read model interfaces:
   - NotebookReadModel interface with methods like getNotebook(notebookId), getCells(notebookId), etc.
   - LibraryReadModel interface with methods like getNotebooks(), getNotebook(notebookId), etc.

3. Create in-memory read model implementations:
   - InMemoryNotebookReadModel
   - InMemoryLibraryReadModel
   - These should maintain state based on projected events

4. Create event projectors for each domain:
   - NotebookProjector: handles notebook-related events and updates NotebookReadModel
   - CellProjector: handles cell-related events and updates read models
   - LibraryProjector: handles library-related events and updates LibraryReadModel

5. Each projector should:
   - Subscribe to relevant domain events
   - Update the appropriate read model when events are received
   - Handle event ordering and deduplication
   - Be testable in isolation

6. Integrate the event bus with command handlers:
   - When command handlers publish events, they should also publish to the event bus
   - Projectors should automatically update read models when events are published

7. Update the existing SSE endpoint to use read models instead of rebuilding state from events:
   - Replace the current polling-based approach with read model queries
   - Use the NotebookReadModel to get current state
   - Still stream new events, but use read models for initial state

The goal is to have a clean separation between write operations (commands) and read operations (queries), with event projectors maintaining read models that can be queried efficiently.
```

---

## Phase 4: WebSocket Integration

**Goal**: Integrate WebSocket server and optimize real-time communication

### What to do:

1. **Integrate WebSocket server**
   - Move WebSocket server into SvelteKit application
   - Remove separate WebSocket server (port 3001)
   - Use SvelteKit's built-in WebSocket support

2. **Implement event-driven updates**
   - Replace polling-based SSE with event-driven updates
   - Connect projectors to WebSocket broadcasting

3. **Optimize connection management**
   - Implement connection pooling
   - Add proper cleanup and error handling

### Files to create:

- `src/lib/server/infrastructure/websocket/`
- `src/lib/server/application/ports/outbound/websocket-service.ts`

### Files to modify:

- `src/routes/api/notebooks/[notebookId]/events/+server.ts`
- `src/routes/notebook/[notebookId]/+page.svelte`
- Remove `websocket-server.cjs`

### Benefits:

- Single application server
- Better performance with event-driven updates
- Easier deployment and maintenance

### Detailed Prompt for Phase 4:

```
Please integrate the WebSocket server into the SvelteKit application and optimize real-time communication.

Specifically:
1. Create a WebSocket service interface and implementation:
   - WebSocketService interface with methods like broadcastToNotebook(notebookId, event)
   - SvelteKitWebSocketService implementation using SvelteKit's built-in WebSocket support
   - Connection management with proper cleanup and error handling

2. Integrate WebSocket broadcasting with event projectors:
   - When projectors update read models, they should also broadcast to WebSocket connections
   - Create a WebSocketProjector that listens to all events and broadcasts to relevant notebooks
   - Ensure events are broadcast to the correct notebook connections

3. Replace the current SSE endpoint with WebSocket connections:
   - Remove the polling-based SSE implementation in /api/notebooks/[notebookId]/events/+server.ts
   - Create a new WebSocket endpoint that handles real-time updates
   - Send initial state from read models when clients connect
   - Stream new events as they occur

4. Update the client-side code:
   - Modify the WebSocket connection logic in the notebook page
   - Remove the separate WebSocket server connection (port 3001)
   - Use the integrated WebSocket endpoint
   - Handle connection management, reconnection, and error handling

5. Remove the standalone WebSocket server:
   - Delete websocket-server.cjs
   - Remove StandaloneWebSocketBroadcaster
   - Update any references to the old WebSocket server

6. Implement proper connection management:
   - Track active connections per notebook
   - Handle connection cleanup when clients disconnect
   - Implement heartbeat/ping-pong for connection health
   - Add proper error handling and reconnection logic

7. Optimize event broadcasting:
   - Batch multiple events for the same notebook
   - Implement event deduplication
   - Add connection filtering to avoid unnecessary broadcasts

The goal is to have a single, integrated WebSocket server that provides real-time updates efficiently, replacing the current polling-based approach and separate WebSocket server.
```

---

## Phase 5: Caching and Performance Optimization

**Goal**: Implement caching and optimize performance

### What to do:

1. **Implement read model caching**
   - Add Redis or in-memory caching
   - Cache frequently accessed data
   - Implement cache invalidation

2. **Add event batching**
   - Batch multiple events for better performance
   - Implement event compression
   - Add event deduplication

3. **Optimize event processing**
   - Add event snapshots for faster recovery
   - Implement event replay optimization
   - Add performance monitoring

### Files to create:

- `src/lib/server/infrastructure/caching/`
- `src/lib/server/infrastructure/monitoring/`

### Files to modify:

- `src/lib/server/application/projectors/`
- `src/lib/server/application/read-models/`

### Benefits:

- Better performance for large datasets
- Reduced memory usage
- Better scalability

### Detailed Prompt for Phase 5:

```
Please implement caching and performance optimizations to improve scalability and performance.

Specifically:
1. Implement read model caching:
   - Create a CachedReadModel wrapper that caches frequently accessed data
   - Add cache invalidation when events are processed
   - Implement cache warming for frequently accessed notebooks
   - Add cache size limits and LRU eviction

2. Add event batching and optimization:
   - Implement EventBatcher that groups multiple events for the same notebook
   - Add event compression for large payloads
   - Implement event deduplication to avoid processing the same event multiple times
   - Add event filtering to only process relevant events

3. Optimize event processing:
   - Add event snapshots for faster recovery (snapshot every N events)
   - Implement event replay optimization for large event streams
   - Add event indexing for faster event retrieval
   - Implement event archiving for old events

4. Add performance monitoring:
   - Create performance metrics for event processing
   - Add monitoring for WebSocket connections and broadcasting
   - Implement health checks for all components
   - Add logging for performance analysis

5. Implement connection pooling and optimization:
   - Add connection pooling for database/event store connections
   - Implement connection health monitoring
   - Add automatic reconnection for failed connections
   - Optimize WebSocket connection management

6. Add memory management:
   - Implement memory usage monitoring
   - Add garbage collection optimization
   - Implement memory leak detection
   - Add memory usage alerts

7. Optimize for large datasets:
   - Implement pagination for large event streams
   - Add lazy loading for read models
   - Implement incremental updates for large notebooks
   - Add data compression for stored events

The goal is to have a highly performant, scalable system that can handle large datasets and many concurrent users efficiently.
```

---

## Implementation Order and Dependencies

### Phase 1 → Phase 2

- Phase 1 must be completed before Phase 2
- Command handlers depend on clean domain services

### Phase 2 → Phase 3

- Phase 2 must be completed before Phase 3
- Projectors depend on command handlers for events

### Phase 3 → Phase 4

- Phase 3 must be completed before Phase 4
- WebSocket integration depends on event projectors

### Phase 4 → Phase 5

- Phase 4 must be completed before Phase 5
- Caching depends on integrated WebSocket system

## Risk Mitigation

### For each phase:

1. **Maintain backward compatibility** - Keep existing APIs working
2. **Add feature flags** - Enable new functionality gradually
3. **Comprehensive testing** - Test each phase thoroughly
4. **Rollback plan** - Ability to revert changes if needed

### Testing strategy:

- **Unit tests** for each new component
- **Integration tests** for API endpoints
- **E2E tests** for complete user workflows
- **Performance tests** for optimization phases

## Estimated Timeline

- **Phase 1**: 1-2 weeks (Domain cleanup)
- **Phase 2**: 2-3 weeks (Command handlers)
- **Phase 3**: 2-3 weeks (Event projectors)
- **Phase 4**: 1-2 weeks (WebSocket integration)
- **Phase 5**: 2-3 weeks (Caching and optimization)

**Total**: 8-13 weeks for complete refactoring

## Success Criteria

After completing all phases, the system should have:

- Single roundtrip event flow (Browser → API → Command → Event Store → Projector → WebSocket → Browser)
- Clean architecture with proper separation of concerns
- Event-driven updates instead of polling
- Better performance and scalability
- Easier testing and maintenance
- Proper error handling and resilience
