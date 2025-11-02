# Notebook Search Feature - Implementation Plan

## Overview

Implement a search feature that allows users to search notebooks by title and open them. The search can optionally be limited to private or public notebooks (when notebook scoping is implemented).

## Requirements

From TODO.md:

> "Enable searching for a notebook based on the title and, when selected, open the notebook. The search can be limited to private only or public."

## Current State Analysis

### ✅ What Exists

- **Search UI Trigger**: `TopBar.svelte` has a search button that dispatches `'search'` event
- **Library Read Model**: `LibraryReadModel` interface with `getNotebooks()` method
- **Authentication**: User authentication system is in place
- **API Contracts**: Centralized type definitions in `api-contracts.ts`
- **Notebook Navigation**: Routes exist for `/notebook/[notebookId]`

### ❌ What's Missing

- Search functionality in `LibraryReadModel` interface
- Search implementation in `InMemoryLibraryReadModel`
- Search API endpoint
- Search UI component (modal/dropdown)
- Private/public notebook scoping (deferred to future)

## Architecture Design

### Layer Responsibilities

```
Routes (Presentation)
    ↓
Application (Use Cases)
    ↓
Domain (Business Logic)
    ↓
Infrastructure (Read Models)
```

### Clean Architecture Compliance

- **Domain Layer**: No search logic (pure data structures)
- **Application Layer**: Search query interface extension
- **Infrastructure Layer**: Search implementation in read model

## Implementation Plan

### Phase 1: Backend - Search Functionality

#### 1.1 Extend LibraryReadModel Interface

**File**: `src/lib/server/application/ports/inbound/read-models.ts`

Add search method to `LibraryReadModel` interface:

```typescript
export interface LibraryReadModel {
	getNotebooks(): Promise<Notebook[]>;
	getNotebook(notebookId: string): Promise<Notebook | null>;
	getNotebookCount(): Promise<number>;

	// NEW: Search notebooks by title
	searchNotebooks(query: string): Promise<Notebook[]>;
}
```

**Rationale**:

- Extends existing interface (Interface Segregation Principle)
- Search is a query operation (read-only)
- Follows existing pattern of async methods

#### 1.2 Implement Search in InMemoryLibraryReadModel

**File**: `src/lib/server/application/adapters/inbound/in-memory-library-read-model.ts`

Implement case-insensitive title matching:

```typescript
async searchNotebooks(query: string): Promise<Notebook[]> {
	if (!query || query.trim() === '') {
		return [];
	}

	const normalizedQuery = query.trim().toLowerCase();
	const allNotebooks = Array.from(this.notebooks.values());

	const matchingNotebooks = allNotebooks.filter(notebook =>
		notebook.title.toLowerCase().includes(normalizedQuery)
	);

	logger.debug(`LibraryReadModel: searchNotebooks("${query}"): ${matchingNotebooks.length} results`);
	return [...matchingNotebooks]; // Return copy
}
```

**Features**:

- Case-insensitive matching
- Partial title matching (substring search)
- Empty query returns empty array
- Returns copy to prevent mutation
- Logging for debugging

#### 1.3 Create Search API Endpoint

**File**: `src/routes/api/notebooks/search/+server.ts`

```typescript
export async function GET({ url, locals }: RequestEvent): Promise<Response> {
	const query = url.searchParams.get('q') || '';
	const limit = parseInt(url.searchParams.get('limit') || '20', 10);

	if (!query || query.trim() === '') {
		return json({ notebooks: [] });
	}

	const notebooks = await locals.libraryReadModel.searchNotebooks(query);

	// Limit results
	const limited = notebooks.slice(0, limit);

	const response: SearchNotebooksResponse = {
		notebooks: limited.map((nb) => ({
			id: nb.id,
			title: nb.title,
			description: nb.description,
			createdAt: nb.createdAt.toISOString(),
			updatedAt: nb.updatedAt.toISOString()
		}))
	};

	return json(response);
}
```

**Query Parameters**:

- `q`: Search query string (required)
- `limit`: Maximum results to return (default: 20, optional)

**Authentication**:

- For now: No authentication required (all notebooks visible)
- Future: Filter by private/public based on user authentication

#### 1.4 Add API Contracts

**File**: `src/lib/types/api-contracts.ts`

Add search request/response types:

```typescript
export interface SearchNotebooksResponse {
	notebooks: Array<{
		id: string;
		title: string;
		description?: string;
		createdAt: string;
		updatedAt: string;
	}>;
}

export interface SearchNotebooksError extends ApiError {
	error: 'Invalid query' | 'Search failed';
}
```

### Phase 2: Frontend - Search UI

#### 2.1 Create Search Modal Component

**File**: `src/lib/components/SearchNotebookModal.svelte`

**Features**:

- Search input with debouncing (300ms)
- Results list showing notebook title and description
- Empty state message
- Loading state
- Error handling
- Keyboard navigation (arrow keys, enter to select)
- Click outside to close

**Props**:

```typescript
let {
	isOpen = false,
	onClose = () => {},
	onSelect = (notebookId: string) => {}
}: {
	isOpen: boolean;
	onClose: () => void;
	onSelect: (notebookId: string) => void;
} = $props();
```

**State**:

```typescript
let searchQuery = $state('');
let results = $state<SearchNotebooksResponse['notebooks']>([]);
let isLoading = $state(false);
let error = $state<string | null>(null);
let selectedIndex = $state(-1);
```

**UI Structure**:

```
┌─────────────────────────────────────┐
│ Search Notebooks              [×]    │
├─────────────────────────────────────┤
│ [Search input field...]             │
├─────────────────────────────────────┤
│ Results:                            │
│ ┌─────────────────────────────────┐ │
│ │ 📓 Notebook Title               │ │
│ │   Description if available      │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 📓 Another Notebook             │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

#### 2.2 Integrate with TopBar

**File**: `src/lib/components/TopBar.svelte`

Update `handleSearch()` to show modal:

```typescript
let showSearchModal = $state(false);

function handleSearch() {
	showSearchModal = true;
}

function handleCloseSearch() {
	showSearchModal = false;
}

function handleSelectNotebook(event: CustomEvent<{ notebookId: string }>) {
	showSearchModal = false;
	// Navigate to notebook
	goto(`/notebook/${event.detail.notebookId}`);
}
```

**Template**:

```svelte
<SearchNotebookModal
	bind:isOpen={showSearchModal}
	on:close={handleCloseSearch}
	on:select={handleSelectNotebook}
/>
```

#### 2.3 Create Client Search Service

**File**: `src/lib/client/services/notebook-search.service.ts`

```typescript
import type { SearchNotebooksResponse } from '$lib/types/api-contracts';

export class NotebookSearchService {
	async search(query: string, limit = 20): Promise<SearchNotebooksResponse> {
		const params = new URLSearchParams({ q: query, limit: limit.toString() });
		const response = await fetch(`/api/notebooks/search?${params}`);

		if (!response.ok) {
			throw new Error(`Search failed: ${response.statusText}`);
		}

		return await response.json();
	}
}
```

**Rationale**:

- Separates API concerns from UI
- Reusable search logic
- Easy to test

### Phase 3: Future Enhancements

#### 3.1 Private/Public Filtering

When notebook scoping is implemented:

1. Add `visibility?: 'private' | 'public'` to `Notebook` type
2. Add `ownerId?: UserId` to `Notebook` type
3. Filter search results based on:
   - If authenticated: Show user's private notebooks + all public notebooks
   - If not authenticated: Show only public notebooks
4. Add filter parameter to search API:
   ```typescript
   GET /api/notebooks/search?q=query&visibility=public|private|all
   ```

#### 3.2 Advanced Search

Future improvements:

- Search in description as well as title
- Search by tags/categories
- Sort by relevance/date
- Pagination for large result sets
- Search history
- Recent searches

## File Structure

```
src/
├── lib/
│   ├── server/
│   │   └── application/
│   │       ├── ports/
│   │       │   └── inbound/
│   │       │       └── read-models.ts (extend interface)
│   │       └── adapters/
│   │           └── inbound/
│   │               └── in-memory-library-read-model.ts (implement search)
│   ├── client/
│   │   └── services/
│   │       └── notebook-search.service.ts (new)
│   ├── components/
│   │   └── SearchNotebookModal.svelte (new)
│   └── types/
│       └── api-contracts.ts (add search types)
└── routes/
    └── api/
        └── notebooks/
            └── search/
                └── +server.ts (new)
```

## Testing Strategy

### Unit Tests

1. **InMemoryLibraryReadModel.searchNotebooks()**
   - Test case-insensitive matching
   - Test partial matches
   - Test empty query
   - Test no results
   - Test multiple results

2. **NotebookSearchService**
   - Test successful search
   - Test error handling
   - Test query parameter encoding

### Integration Tests

1. **Search API Endpoint**
   - Test with valid query
   - Test with empty query
   - Test with limit parameter
   - Test error handling

### Component Tests

1. **SearchNotebookModal**
   - Test modal open/close
   - Test search input
   - Test result display
   - Test keyboard navigation
   - Test notebook selection

## Implementation Order

1. ✅ Extend `LibraryReadModel` interface
2. ✅ Implement `searchNotebooks()` in `InMemoryLibraryReadModel`
3. ✅ Add search API endpoint
4. ✅ Add API contracts
5. ✅ Create `NotebookSearchService`
6. ✅ Create `SearchNotebookModal` component
7. ✅ Integrate with `TopBar`
8. ✅ Add unit tests
9. ✅ Add integration tests
10. ✅ Add component tests

## Dependencies

- No new dependencies required
- Uses existing patterns:
  - Event-driven architecture
  - Clean Architecture layers
  - TypeScript strict mode
  - Svelte 5 runes

## Success Criteria

- ✅ Users can search notebooks by title
- ✅ Search is case-insensitive
- ✅ Results display in a modal
- ✅ Users can select a notebook and navigate to it
- ✅ Search is debounced to avoid excessive API calls
- ✅ Empty states and errors are handled gracefully
- ✅ All tests pass
- ✅ Follows Clean Architecture principles

## Future Considerations

- Private/public filtering when notebook scoping is implemented
- Search in description field
- Search history
- Search suggestions/autocomplete
- Advanced filtering (by date, owner, etc.)
