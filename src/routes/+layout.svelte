<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import AuthButton from '$lib/components/AuthButton.svelte';
	import { authService } from '$lib/client/services/auth.service';
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();

	// Initialize auth service with server data
	$effect(() => {
		if (data.user) {
			// Convert serialized dates back to Date objects
			const user = {
				...data.user,
				createdAt: new Date(data.user.createdAt),
				lastLoginAt: new Date(data.user.lastLoginAt)
			};
			authService.setUser(user);
		} else {
			authService.setUser(null);
		}
	});

	// Hide fixed auth button on pages that have TopBar (notebook pages and home page)
	// TopBar includes its own AuthButton, so we don't need the fixed one
	let isTopBarPage = $derived(
		$page.route.id?.includes('/notebook/') || $page.route.id === '/' || false
	);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-layout">
	{@render children?.()}
</div>

<!-- Global Auth Button (floating, hidden on pages with TopBar) -->
{#if !isTopBarPage}
	<div class="auth-button-container">
		<AuthButton
			user={data.user
				? {
						...data.user,
						createdAt: new Date(data.user.createdAt),
						lastLoginAt: new Date(data.user.lastLoginAt)
					}
				: null}
			isAuthenticated={data.isAuthenticated}
			isLoading={false}
		/>
	</div>
{/if}

<style>
	.app-layout {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.auth-button-container {
		position: fixed;
		top: var(--space-4);
		right: var(--space-4);
		z-index: 9999;
		pointer-events: auto;
	}
</style>
