import { writable, derived } from 'svelte/store';
import type { User } from '$lib/server/domain/value-objects';

// Authentication state stores
export const authUser = writable<User | null>(null);
export const isAuthenticated = derived(authUser, ($user) => $user !== null);
export const isLoading = writable<boolean>(false);

// Authentication service class
export class AuthService {
	private static instance: AuthService;
	private user: User | null = null;
	private loading = false;

	private constructor() {
		// Initialize from server-side data if available
		this.initializeFromServer();
	}

	public static getInstance(): AuthService {
		if (!AuthService.instance) {
			AuthService.instance = new AuthService();
		}
		return AuthService.instance;
	}

	/**
	 * Initialize authentication state from server-side data
	 */
	private async initializeFromServer(): Promise<void> {
		try {
			this.setLoading(true);
			const response = await fetch('/api/auth/me');

			if (response.ok) {
				const data = await response.json();
				if (data.user) {
					this.setUser(data.user);
				} else {
					this.setUser(null);
				}
			} else {
				this.setUser(null);
			}
		} catch (error) {
			console.error('Failed to initialize auth state:', error);
			this.setUser(null);
		} finally {
			this.setLoading(false);
		}
	}

	/**
	 * Get current user
	 */
	public getCurrentUser(): User | null {
		return this.user;
	}

	/**
	 * Check if user is authenticated
	 */
	public isUserAuthenticated(): boolean {
		return this.user !== null;
	}

	/**
	 * Set user and update stores
	 */
	public setUser(user: User | null): void {
		this.user = user;
		authUser.set(user);
	}

	/**
	 * Set loading state
	 */
	public setLoading(loading: boolean): void {
		this.loading = loading;
		isLoading.set(loading);
	}

	/**
	 * Sign in user (redirects to OAuth)
	 */
	public signIn(): void {
		window.location.href = '/auth/google';
	}

	/**
	 * Sign out user
	 */
	public async signOut(): Promise<void> {
		try {
			this.setLoading(true);
			// Redirect to logout endpoint
			window.location.href = '/auth/logout';
		} catch (error) {
			console.error('Error signing out:', error);
			this.setLoading(false);
		}
	}

	/**
	 * Refresh authentication state
	 */
	public async refresh(): Promise<void> {
		await this.initializeFromServer();
	}

	/**
	 * Check if authentication is loading
	 */
	public isLoading(): boolean {
		return this.loading;
	}
}

// Export singleton instance
export const authService = AuthService.getInstance();
