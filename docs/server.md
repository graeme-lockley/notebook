# Server Architecture Design

## Overview

This document outlines the high-level server architecture for the ObservableHQ clone notebook application. The design follows clean architecture principles with an event-driven approach using the [Event Store](https://github.com/graeme-lockley/event-store) implementation.

## Architecture Principles

### Clean Architecture

- **Ports**: Interfaces that define contracts between layers
- **Adapters**: Implementations that fulfill port contracts
- **Domain**: Core business logic and entities
- **Infrastructure**: External concerns (database, messaging, etc.)

### Event-Driven Design

- All state changes are captured as events
- Events are stored in the Event Store for persistence and replay
- Real-time collaboration through event streaming
- Audit trail and version history built-in

## Directory Structure

```
src/
├── lib/
│   └── server/                    # Server-side code (not accessible from client)
│       ├── ports/                 # Ports (interfaces/contracts)
│       │   ├── repositories/      # Repository interfaces
│       │   │   ├── notebook.repository.ts
│       │   │   ├── cell.repository.ts
│       │   │   └── user.repository.ts
│       │   ├── services/          # Service interfaces
│       │   │   ├── notebook.service.ts
│       │   │   ├── search.service.ts
│       │   │   ├── auth.service.ts
│       │   │   └── event-store.service.ts
│       │   └── events/            # Event interfaces
│       │       ├── notebook.events.ts
│       │       ├── cell.events.ts
│       │       └── event.types.ts
│       │
│       ├── adapters/              # Adapters (implementations)
│       │   ├── repositories/      # Repository implementations
│       │   │   ├── event-store/   # Event Store based repositories
│       │   │   │   ├── event-store-notebook.repository.ts
│       │   │   │   ├── event-store-cell.repository.ts
│       │   │   │   └── event-store-user.repository.ts
│       │   │   └── in-memory/     # In-memory implementations (testing)
│       │   │       ├── in-memory-notebook.repository.ts
│       │   │       └── in-memory-cell.repository.ts
│       │   ├── services/          # Service implementations
│       │   │   ├── notebook.service.impl.ts
│       │   │   ├── search.service.impl.ts
│       │   │   └── auth.service.impl.ts
│       │   └── external/          # External service adapters
│       │       ├── email.service.ts
│       │       └── storage.service.ts
│       │
│       ├── domain/                # Domain models & business logic
│       │   ├── entities/          # Core business entities
│       │   │   ├── notebook.entity.ts
│       │   │   ├── cell.entity.ts
│       │   │   └── user.entity.ts
│       │   ├── value-objects/     # Value objects
│       │   │   ├── cell-id.vo.ts
│       │   │   ├── notebook-title.vo.ts
│       │   │   └── cell-kind.vo.ts
│       │   ├── aggregates/        # Aggregates
│       │   │   └── notebook.aggregate.ts
│       │   ├── events/            # Domain events
│       │   │   ├── notebook-created.event.ts
│       │   │   ├── cell-updated.event.ts
│       │   │   ├── cell-executed.event.ts
│       │   │   └── event.base.ts
│       │   ├── services/          # Domain services
│       │   │   ├── notebook-execution.service.ts
│       │   │   ├── dependency-graph.service.ts
│       │   │   └── cell-validation.service.ts
│       │   └── repositories/      # Repository interfaces (re-export from ports)
│       │
│       ├── application/           # Application layer (use cases)
│       │   ├── use-cases/         # Application use cases
│       │   │   ├── notebook/
│       │   │   │   ├── create-notebook.usecase.ts
│       │   │   │   ├── update-notebook.usecase.ts
│       │   │   │   ├── delete-notebook.usecase.ts
│       │   │   │   ├── search-notebooks.usecase.ts
│       │   │   │   └── get-notebook-history.usecase.ts
│       │   │   ├── cell/
│       │   │   │   ├── create-cell.usecase.ts
│       │   │   │   ├── update-cell.usecase.ts
│       │   │   │   ├── delete-cell.usecase.ts
│       │   │   │   ├── execute-cell.usecase.ts
│       │   │   │   └── move-cell.usecase.ts
│       │   │   └── event/
│       │   │       ├── append-event.usecase.ts
│       │   │       ├── replay-events.usecase.ts
│       │   │       └── stream-events.usecase.ts
│       │   └── services/          # Application services
│       │       └── notebook-application.service.ts
│       │
│       └── infrastructure/        # Infrastructure concerns
│           ├── event-store/       # Event Store integration
│           │   ├── client.ts      # Event Store client wrapper
│           │   ├── config.ts      # Event Store configuration
│           │   └── health.ts      # Health monitoring
│           ├── database/          # Database configuration (if needed)
│           │   ├── connection.ts
│           │   └── migrations/
│           ├── messaging/         # Message bus, event streaming
│           │   ├── event-bus.impl.ts
│           │   └── event-stream.impl.ts
│           ├── security/          # Authentication, authorization
│           │   ├── jwt.service.ts
│           │   ├── password.service.ts
│           │   └── auth.middleware.ts
│           └── logging/           # Logging, monitoring
│               └── logger.service.ts
│
├── routes/                        # SvelteKit API routes (thin controllers)
│   └── api/                      # API endpoints
│       ├── notebooks/
│       │   ├── +server.ts        # GET /api/notebooks, POST /api/notebooks
│       │   ├── [id]/
│       │   │   ├── +server.ts    # GET /api/notebooks/[id], PUT, DELETE
│       │   │   ├── cells/
│       │   │   │   └── +server.ts # GET /api/notebooks/[id]/cells
│       │   │   └── events/
│       │   │       └── +server.ts # GET /api/notebooks/[id]/events
│       │   └── search/
│       │       └── +server.ts    # GET /api/notebooks/search?q=query
│       ├── cells/
│       │   ├── +server.ts        # GET /api/cells, POST /api/cells
│       │   └── [id]/
│       │       ├── +server.ts    # GET /api/cells/[id], PUT, DELETE
│       │       └── execute/
│       │           └── +server.ts # POST /api/cells/[id]/execute
│       ├── events/
│       │   ├── +server.ts        # GET /api/events
│       │   └── stream/
│       │       └── +server.ts    # GET /api/events/stream (SSE)
│       └── auth/
│           ├── login/
│           │   └── +server.ts    # POST /api/auth/login
│           ├── logout/
│           │   └── +server.ts    # POST /api/auth/logout
│           └── register/
│               └── +server.ts    # POST /api/auth/register
```

## Event Store Integration

### Event Topics

- `notebooks` - Notebook lifecycle events
- `notebook-{id}` - Cell events for specific notebooks
- `users` - User management events
- `cells` - Cell execution and update events

### Event Types

```typescript
// Notebook Events
interface NotebookCreatedEvent {
	type: 'notebook.created';
	payload: {
		notebookId: string;
		title: string;
		description?: string;
		userId: string;
		createdAt: Date;
	};
}

interface NotebookUpdatedEvent {
	type: 'notebook.updated';
	payload: {
		notebookId: string;
		changes: Partial<{
			title: string;
			description: string;
		}>;
		updatedAt: Date;
	};
}

// Cell Events
interface CellCreatedEvent {
	type: 'cell.created';
	payload: {
		cellId: string;
		notebookId: string;
		kind: CellKind;
		value: string;
		position: number;
		createdAt: Date;
	};
}

interface CellUpdatedEvent {
	type: 'cell.updated';
	payload: {
		cellId: string;
		notebookId: string;
		changes: Partial<{
			value: string;
			kind: CellKind;
			isClosed: boolean;
		}>;
		updatedAt: Date;
	};
}

interface CellExecutedEvent {
	type: 'cell.executed';
	payload: {
		cellId: string;
		notebookId: string;
		result: unknown;
		executionTime: number;
		executedAt: Date;
	};
}
```

### Event Store Service

```typescript
// src/lib/server/infrastructure/event-store/client.ts
export class EventStoreService {
	private client: EventStoreClient;

	constructor() {
		this.client = new EventStoreClient({
			baseUrl: process.env.EVENT_STORE_URL || 'http://localhost:8000',
			timeout: 5000,
			retries: 3,
			retryDelay: 1000
		});
	}

	async publishEvent(topic: string, eventType: string, payload: unknown): Promise<string> {
		return await this.client.publishEvent(topic, eventType, payload);
	}

	async getEvents(topic: string, options?: EventRetrievalOptions): Promise<Event[]> {
		return await this.client.getEvents(topic, options);
	}

	async streamEvents(topic: string, sinceEventId?: string): Promise<ReadableStream<Event>> {
		// Implementation for real-time event streaming
	}
}
```

## API Design

### RESTful Endpoints

- **Notebooks**: CRUD operations with event sourcing
- **Cells**: CRUD operations with execution capabilities
- **Events**: Event retrieval and streaming
- **Search**: Full-text search across notebooks and cells
- **Auth**: User authentication and authorization

### Real-time Features

- **Server-Sent Events (SSE)**: Live updates for collaborative editing
- **WebSocket Support**: Real-time cell execution results
- **Event Streaming**: Live event feed for notebook changes

### Authentication & Authorization

- JWT-based authentication
- Role-based access control
- Notebook sharing and permissions
- Public/private notebook support

## Data Flow

### 1. Client Request

```
Client → API Route → Use Case → Domain Service → Repository → Event Store
```

### 2. Event Publishing

```
Domain Service → Event Store → Event Bus → Consumers (Webhooks, SSE)
```

### 3. State Rebuild

```
Event Store → Repository → Domain Entity → Response
```

## Benefits

### Event Sourcing

- Complete audit trail
- Time-travel debugging
- Easy collaboration features
- Built-in version control

### Clean Architecture

- Testable business logic
- Swappable implementations
- Clear separation of concerns
- Maintainable codebase

### Scalability

- Event-driven microservices
- Horizontal scaling support
- Real-time capabilities
- Offline-first with sync

## Implementation Phases

### Phase 1: Core Infrastructure

- Event Store integration
- Basic repository implementations
- Core domain entities

### Phase 2: API Endpoints

- Notebook CRUD operations
- Cell management
- Event streaming

### Phase 3: Advanced Features

- Real-time collaboration
- Search functionality
- User management

### Phase 4: Performance & Scale

- Caching strategies
- Event optimization
- Monitoring and metrics

## Technology Stack

- **Framework**: SvelteKit with server-side rendering
- **Event Store**: [Event Store](https://github.com/graeme-lockley/event-store) implementation
- **Language**: TypeScript (strict mode)
- **Database**: Event Store (file-based, no additional database required)
- **Authentication**: JWT with secure cookies
- **Real-time**: Server-Sent Events and WebSockets
- **Testing**: Vitest for unit tests, Playwright for integration tests

## Security Considerations

- Input validation and sanitization
- Rate limiting on API endpoints
- CORS configuration
- Secure event storage
- User permission validation
- Audit logging for all operations
