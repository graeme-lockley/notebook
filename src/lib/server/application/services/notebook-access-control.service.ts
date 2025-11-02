import type { Notebook } from '$lib/server/domain/value-objects';

/**
 * Service for checking notebook access permissions based on visibility, authentication status, and ownership.
 *
 * Implements the following access control matrix:
 *
 * Public Notebooks:
 * - Anonymous: search, view
 * - Authenticated: search, view, edit, import
 * - Owner: edit (implied in authenticated)
 *
 * Protected Notebooks:
 * - Anonymous: search, view, import
 * - Authenticated: search, view, import
 * - Owner: edit
 *
 * Private Notebooks:
 * - Anonymous: nothing (cannot access)
 * - Authenticated: nothing (cannot access)
 * - Owner: search, view, edit, import
 */
export class NotebookAccessControlService {
	/**
	 * Checks if a user can view a notebook (includes loading notebook data)
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	canView(notebook: Notebook, userId: string | null, isAuthenticated: boolean): boolean {
		const isOwner = this.isOwner(notebook, userId);

		switch (notebook.visibility) {
			case 'public':
				// Public: everyone can view (anonymous or authenticated)
				return true;
			case 'protected':
				// Protected: everyone can view (anonymous or authenticated)
				return true;
			case 'private':
				// Private: only owner can view
				return isOwner;
			default:
				return false;
		}
	}

	/**
	 * Checks if a user can edit a notebook (modify cells, update metadata)
	 */
	canEdit(notebook: Notebook, userId: string | null, isAuthenticated: boolean): boolean {
		const isOwner = this.isOwner(notebook, userId);

		switch (notebook.visibility) {
			case 'public':
				// Public: any authenticated user can edit
				return isAuthenticated;
			case 'protected':
				// Protected: only owner can edit
				return isOwner;
			case 'private':
				// Private: only owner can edit
				return isOwner;
			default:
				return false;
		}
	}

	/**
	 * Checks if a user can import a notebook (use it in import statements)
	 */
	canImport(notebook: Notebook, userId: string | null, isAuthenticated: boolean): boolean {
		const isOwner = this.isOwner(notebook, userId);

		switch (notebook.visibility) {
			case 'public':
				// Public: authenticated users can import
				return isAuthenticated;
			case 'protected':
				// Protected: everyone can import (anonymous or authenticated)
				return true;
			case 'private':
				// Private: only owner can import
				return isOwner;
			default:
				return false;
		}
	}

	/**
	 * Checks if a user can search for a notebook (see it in search results)
	 * Note: If a user can view a notebook, they can see it in search results.
	 */
	canSearch(notebook: Notebook, userId: string | null, isAuthenticated: boolean): boolean {
		// Search visibility matches view visibility
		return this.canView(notebook, userId, isAuthenticated);
	}

	/**
	 * Helper to check if a user is the owner of a notebook
	 */
	private isOwner(notebook: Notebook, userId: string | null): boolean {
		if (!userId || !notebook.ownerId) {
			return false;
		}
		return notebook.ownerId === userId;
	}
}
