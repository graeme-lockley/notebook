import { describe, it, expect } from 'vitest';
import { NotebookAccessControlService } from './notebook-access-control.service';
import type { Notebook } from '$lib/server/domain/value-objects';

describe('NotebookAccessControlService', () => {
	const service = new NotebookAccessControlService();

	describe('canImport', () => {
		describe('Protected notebooks', () => {
			const protectedNotebook: Notebook = {
				id: 'notebook-1',
				title: 'Protected Notebook',
				visibility: 'protected',
				ownerId: 'owner-123',
				createdAt: new Date(),
				updatedAt: new Date()
			};

			it('should allow anonymous users to import protected notebooks', () => {
				const canImport = service.canImport(protectedNotebook, null, false);
				expect(canImport).toBe(true);
			});

			it('should allow authenticated users to import protected notebooks', () => {
				const canImport = service.canImport(protectedNotebook, 'user-456', true);
				expect(canImport).toBe(true);
			});

			it('should allow owner to import protected notebooks', () => {
				const canImport = service.canImport(protectedNotebook, 'owner-123', true);
				expect(canImport).toBe(true);
			});

			it('should allow non-owner authenticated users to import protected notebooks', () => {
				const canImport = service.canImport(protectedNotebook, 'other-user-789', true);
				expect(canImport).toBe(true);
			});
		});

		describe('Public notebooks', () => {
			const publicNotebook: Notebook = {
				id: 'notebook-2',
				title: 'Public Notebook',
				visibility: 'public',
				ownerId: 'owner-123',
				createdAt: new Date(),
				updatedAt: new Date()
			};

			it('should not allow anonymous users to import public notebooks', () => {
				const canImport = service.canImport(publicNotebook, null, false);
				expect(canImport).toBe(false);
			});

			it('should allow authenticated users to import public notebooks', () => {
				const canImport = service.canImport(publicNotebook, 'user-456', true);
				expect(canImport).toBe(true);
			});
		});

		describe('Private notebooks', () => {
			const privateNotebook: Notebook = {
				id: 'notebook-3',
				title: 'Private Notebook',
				visibility: 'private',
				ownerId: 'owner-123',
				createdAt: new Date(),
				updatedAt: new Date()
			};

			it('should not allow anonymous users to import private notebooks', () => {
				const canImport = service.canImport(privateNotebook, null, false);
				expect(canImport).toBe(false);
			});

			it('should not allow non-owner authenticated users to import private notebooks', () => {
				const canImport = service.canImport(privateNotebook, 'user-456', true);
				expect(canImport).toBe(false);
			});

			it('should allow owner to import private notebooks', () => {
				const canImport = service.canImport(privateNotebook, 'owner-123', true);
				expect(canImport).toBe(true);
			});
		});
	});
});
