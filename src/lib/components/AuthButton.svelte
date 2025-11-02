<script lang="ts">
	// import { goto } from '$app/navigation';
	// import { page } from '$app/stores';
	import { User, LogOut, Loader2 } from 'lucide-svelte';
	import type { User as UserType } from '$lib/server/domain/value-objects';

	let {
		user = null,
		isAuthenticated = false,
		isLoading = false
	}: {
		user: UserType | null;
		isAuthenticated: boolean;
		isLoading: boolean;
	} = $props();

	let showUserMenu = $state(false);
	let imageLoadFailed = $state(false);

	// Debug: Log user data and authentication state when it changes
	$effect(() => {
		if (user) {
			console.log('AuthButton: State update:', {
				isAuthenticated,
				hasUser: !!user,
				user: {
					id: user.id,
					name: user.name,
					email: user.email,
					picture: user.picture,
					hasPicture: !!(user.picture && user.picture.trim() !== '')
				}
			});
		}
		// Reset image error state when user changes
		imageLoadFailed = false;
	});

	function handleSignIn() {
		// Store current page URL as return URL, then redirect to Google OAuth
		const currentPath = window.location.pathname + window.location.search;
		const returnUrl = encodeURIComponent(currentPath);
		window.location.href = `/auth/google?returnUrl=${returnUrl}`;
	}

	async function handleSignOut() {
		try {
			// Store current page URL to redirect back after logout
			const currentPath = window.location.pathname + window.location.search;
			const returnUrl = encodeURIComponent(currentPath || '/');

			// Use POST method for logout (logout route expects POST)
			const response = await fetch(`/auth/logout?returnUrl=${returnUrl}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include' // Include cookies
			});

			if (response.ok || response.status === 302) {
				// Server will redirect via Location header, but if that fails, redirect client-side
				if (response.headers.get('Location')) {
					window.location.href = response.headers.get('Location') || currentPath || '/';
				} else {
					window.location.href = currentPath || '/';
				}
			} else {
				console.error('Logout failed:', response.status, response.statusText);
				// Still redirect to current page even if logout failed
				window.location.href = currentPath || '/';
			}
		} catch (error) {
			console.error('Error signing out:', error);
			// Redirect to current page even on error
			const currentPath = window.location.pathname + window.location.search;
			window.location.href = currentPath || '/';
		}
	}

	function toggleUserMenu() {
		showUserMenu = !showUserMenu;
	}

	// Close menu when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.user-menu-container')) {
			showUserMenu = false;
		}
	}

	// Close menu on escape key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			showUserMenu = false;
		}
	}
</script>

<svelte:window on:click={handleClickOutside} on:keydown={handleKeydown} />

<div class="auth-container">
	{#if isLoading}
		<div class="auth-loading" data-testid="auth-loading">
			<Loader2 size={16} class="animate-spin" />
			<span>Loading...</span>
		</div>
	{:else if isAuthenticated && user}
		<!-- Authenticated User Menu (Avatar Only) -->
		<div class="user-menu-container" data-testid="user-menu">
			<button
				onclick={toggleUserMenu}
				class="user-button-icon"
				data-testid="user-button"
				aria-label={user.name || 'User menu'}
			>
				<div class="user-avatar">
					{#if user.picture && user.picture.trim() !== '' && !imageLoadFailed}
						<img
							src={user.picture}
							alt={user.name || 'User'}
							class="avatar-image"
							loading="lazy"
							crossOrigin="anonymous"
							referrerPolicy="no-referrer"
							onload={() => {
								console.log('✅ Avatar image loaded successfully:', user.picture);
								imageLoadFailed = false;
							}}
							onerror={() => {
								console.error('❌ Failed to load avatar image:', user.picture);
								imageLoadFailed = true;
							}}
						/>
					{:else}
						<User size={14} />
					{/if}
				</div>
				<!-- Custom tooltip on hover (replaces native title) -->
				<div class="user-tooltip">{user.name || 'User'}</div>
			</button>

			{#if showUserMenu}
				<div class="user-menu" data-testid="user-menu-dropdown">
					<div class="user-info">
						<div class="user-info-name">{user.name}</div>
						<div class="user-info-email">{user.email}</div>
					</div>
					<div class="menu-separator"></div>
					<button onclick={handleSignOut} class="menu-item" data-testid="sign-out-button">
						<LogOut size={14} />
						<span>Sign out</span>
					</button>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Sign In Button (Icon Only) -->
		<button
			onclick={handleSignIn}
			class="sign-in-button-icon"
			data-testid="sign-in-button"
			title="Sign in"
		>
			<User size={14} />
		</button>
	{/if}
</div>

<style>
	.auth-container {
		position: relative;
		display: flex;
		align-items: center;
	}

	.auth-loading {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		color: var(--color-gray-600);
		font-size: var(--font-size-sm);
	}

	.sign-in-button-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		background-color: transparent;
		color: var(--color-gray-700);
		border: var(--border-width) solid var(--color-gray-300);
		border-radius: var(--border-radius);
		cursor: pointer;
		transition: background-color var(--transition-fast);
	}

	.sign-in-button-icon:hover {
		background-color: var(--color-gray-100);
	}

	.sign-in-button-icon:focus {
		outline: 2px solid var(--color-blue-500);
		outline-offset: 2px;
	}

	.user-menu-container {
		position: relative;
	}

	.user-tooltip {
		position: absolute;
		top: calc(100% + var(--space-2));
		right: 0;
		background-color: var(--color-gray-900);
		color: var(--color-white);
		padding: var(--space-1) var(--space-2);
		border-radius: var(--border-radius);
		font-size: var(--font-size-xs);
		white-space: nowrap;
		opacity: 0;
		pointer-events: none;
		transform: translateY(-0.25rem);
		transition:
			opacity var(--transition-fast),
			transform var(--transition-fast);
		z-index: 1000;
		box-shadow: var(--shadow-md);
	}

	.user-button-icon:hover .user-tooltip,
	.user-menu-container:hover .user-tooltip {
		opacity: 1;
		transform: translateY(0);
	}

	.user-button-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		padding: 0;
		background: transparent;
		border: var(--border-width) solid var(--color-gray-300);
		border-radius: 50%;
		cursor: pointer;
		transition: background-color var(--transition-fast);
	}

	.user-button-icon:hover {
		background-color: var(--color-gray-100);
	}

	.user-avatar {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background-color: var(--color-gray-200);
		color: var(--color-gray-600);
		overflow: hidden;
		position: relative;
		isolation: isolate; /* Create new stacking context */
	}

	.avatar-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		border-radius: 50%;
		max-width: 100%;
		max-height: 100%;
		position: relative;
		z-index: 1;
	}

	.user-avatar :global(svg) {
		flex-shrink: 0;
	}

	.user-menu {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: var(--space-1);
		min-width: 12rem;
		background-color: var(--color-white);
		border: var(--border-width) solid var(--color-gray-200);
		border-radius: var(--border-radius);
		box-shadow: var(--shadow-lg);
		z-index: 50;
		overflow: hidden;
	}

	.user-info {
		padding: var(--space-3);
		border-bottom: var(--border-width) solid var(--color-gray-100);
	}

	.user-info-name {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-gray-900);
		margin-bottom: var(--space-1);
	}

	.user-info-email {
		font-size: var(--font-size-xs);
		color: var(--color-gray-500);
	}

	.menu-separator {
		height: var(--border-width);
		background-color: var(--color-gray-100);
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		width: 100%;
		padding: var(--space-2) var(--space-3);
		background: transparent;
		border: none;
		color: var(--color-gray-700);
		font-size: var(--font-size-sm);
		text-align: left;
		cursor: pointer;
		transition: background-color var(--transition-fast);
	}

	.menu-item:hover {
		background-color: var(--color-gray-100);
	}

	.menu-item:focus {
		outline: 2px solid var(--color-blue-500);
		outline-offset: -2px;
	}

	/* Animation for menu */
	.user-menu {
		animation: slideDown 0.15s ease-out;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-0.5rem);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
