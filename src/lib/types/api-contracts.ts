/**
 * API Contracts - Shared type definitions for client-server communication
 *
 * These types represent the JSON-serialized API contract.
 * Note: Date fields are strings (ISO 8601) due to JSON serialization.
 * Domain types may use Date objects internally, but API responses always use strings.
 */

import type { CellKind } from '$lib/server/domain/value-objects/CellKind';

// ============================================================================
// Common Types
// ============================================================================

/**
 * Standard error response shape
 */
export interface ApiError {
	error: string;
	message?: string;
}

/**
 * Cell representation in API responses (JSON-serialized)
 */
export interface ApiCell {
	id: string;
	kind: CellKind;
	value: string;
	createdAt: string; // ISO 8601 string
	updatedAt: string; // ISO 8601 string
}

/**
 * Notebook metadata representation in API responses (JSON-serialized)
 */
export interface ApiNotebook {
	id: string;
	title: string;
	description?: string;
	createdAt: string; // ISO 8601 string
	updatedAt: string; // ISO 8601 string
}

// ============================================================================
// Notebook Endpoints
// ============================================================================

/**
 * POST /api/notebooks
 * Create a new notebook
 */
export interface CreateNotebookRequest {
	title: string;
	description?: string;
	visibility?: 'private' | 'public';
}

export interface CreateNotebookResponse {
	id: string;
	title: string;
	description?: string;
	eventId: string;
	message: string;
}

/**
 * GET /api/notebooks
 * List all notebooks
 */
export interface ListNotebooksResponse {
	notebooks: ApiNotebook[];
}

/**
 * GET /api/notebooks/search
 * Search notebooks by title
 */
export interface SearchNotebooksRequest {
	q: string; // Search query
	limit?: number; // Maximum results (default: 20)
	visibility?: 'private' | 'public' | 'all'; // Filter by visibility
}

export interface SearchNotebooksResponse {
	notebooks: ApiNotebook[];
	count: number;
}

export interface SearchNotebooksError extends ApiError {
	error: 'Invalid query' | 'Search failed';
}

/**
 * GET /api/notebooks/:notebookId
 * Get a specific notebook with its cells
 */
export interface GetNotebookResponse {
	id: string;
	title: string;
	description?: string;
	visibility?: 'private' | 'public';
	createdAt: string; // ISO 8601 string
	updatedAt: string; // ISO 8601 string
	cells: ApiCell[];
}

/**
 * PATCH /api/notebooks/:notebookId
 * Update notebook metadata
 */
export interface UpdateNotebookRequest {
	title?: string;
	description?: string;
	visibility?: 'private' | 'public';
}

export interface UpdateNotebookResponse {
	message: string;
	notebookId: string;
	eventId: string;
}

// ============================================================================
// Cell Endpoints
// ============================================================================

/**
 * POST /api/notebooks/:notebookId/cells
 * Add a new cell to a notebook
 */
export interface AddCellRequest {
	kind: CellKind;
	value: string;
	position: number;
}

export interface AddCellResponse {
	message: string;
	notebookId: string;
	cellId: string;
	eventId: string;
	kind: CellKind;
	position: number;
}

/**
 * PATCH /api/notebooks/:notebookId/cells/:cellId
 * Update or move a cell
 */
export interface UpdateCellRequest {
	kind?: CellKind;
	value?: string;
	position?: number; // If provided, this is a move operation
}

export interface UpdateCellResponse {
	message: string;
	notebookId: string;
	cellId: string;
	eventId: string;
	updates?: {
		kind?: CellKind;
		value?: string;
	};
	position?: number;
}

/**
 * DELETE /api/notebooks/:notebookId/cells/:cellId
 * Delete a cell from a notebook
 */
export interface DeleteCellResponse {
	message: string;
	notebookId: string;
	cellId: string;
	eventId: string;
}

/**
 * POST /api/notebooks/:notebookId/cells/:cellId/duplicate
 * Duplicate a cell
 */
export interface DuplicateCellResponse {
	message: string;
	notebookId: string;
	cellId: string; // ID of the newly created cell
	eventId: string;
}
