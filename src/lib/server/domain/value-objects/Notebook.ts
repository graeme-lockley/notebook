import type { UserId } from './UserId';

export type NotebookVisibility = 'private' | 'public';

export type Notebook = {
	id: string;
	title: string;
	description?: string;
	visibility: NotebookVisibility;
	ownerId: UserId | null; // null for legacy notebooks created before auth
	createdAt: Date;
	updatedAt: Date;
};
