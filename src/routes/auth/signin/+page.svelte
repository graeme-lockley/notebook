<script lang="ts">
	import { goto } from '$app/navigation';
	import { User, ArrowLeft } from 'lucide-svelte';
	import AuthButton from '$lib/components/AuthButton.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function goBack() {
		goto('/');
	}

	function handleSignIn() {
		// Redirect to Google OAuth
		window.location.href = '/auth/google';
	}
</script>

<svelte:head>
	<title>Sign In - ObservableHQ Clone</title>
</svelte:head>

<div class="signin-container">
	<div class="signin-card">
		<!-- Header -->
		<div class="signin-header">
			<button onclick={goBack} class="back-button" data-testid="back-button">
				<ArrowLeft size={20} />
				<span>Back</span>
			</button>
			<h1 class="signin-title">Sign In</h1>
			<p class="signin-subtitle">Access your notebooks and collaborate with others</p>
		</div>

		<!-- Sign In Options -->
		<div class="signin-options">
			{#if data.isAuthenticated}
				<!-- Already signed in -->
				<div class="already-signed-in">
					<div class="user-info">
						<div class="user-avatar">
							{#if data.user?.picture}
								<img src={data.user.picture} alt={data.user.name} />
							{:else}
								<User size={24} />
							{/if}
						</div>
						<div class="user-details">
							<h3>Welcome back, {data.user?.name}!</h3>
							<p>You're already signed in.</p>
						</div>
					</div>
					<div class="auth-button-wrapper">
						<AuthButton user={data.user} isAuthenticated={data.isAuthenticated} isLoading={false} />
					</div>
				</div>
			{:else}
				<!-- Sign in options -->
				<div class="signin-methods">
					<button
						onclick={handleSignIn}
						class="signin-button google-signin"
						data-testid="google-signin-button"
					>
						<svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
							<path
								fill="#4285F4"
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
							/>
							<path
								fill="#34A853"
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							/>
							<path
								fill="#FBBC05"
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
							/>
							<path
								fill="#EA4335"
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
							/>
						</svg>
						<span>Continue with Google</span>
					</button>

					<div class="signin-divider">
						<span>or</span>
					</div>

					<div class="signin-info">
						<h3>Why sign in?</h3>
						<ul>
							<li>Save and sync your notebooks</li>
							<li>Collaborate with others in real-time</li>
							<li>Access your notebooks from anywhere</li>
							<li>Share notebooks with the community</li>
						</ul>
					</div>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="signin-footer">
			<p class="privacy-note">
				By signing in, you agree to our Terms of Service and Privacy Policy.
			</p>
		</div>
	</div>
</div>

<style>
	.signin-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, var(--color-blue-50) 0%, var(--color-indigo-50) 100%);
		padding: var(--space-4);
	}

	.signin-card {
		width: 100%;
		max-width: 24rem;
		background-color: var(--color-white);
		border-radius: var(--border-radius-lg);
		box-shadow: var(--shadow-xl);
		padding: var(--space-8);
	}

	.signin-header {
		text-align: center;
		margin-bottom: var(--space-8);
	}

	.back-button {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		background: transparent;
		border: none;
		color: var(--color-gray-600);
		font-size: var(--font-size-sm);
		cursor: pointer;
		margin-bottom: var(--space-4);
		transition: color var(--transition-fast);
	}

	.back-button:hover {
		color: var(--color-gray-900);
	}

	.signin-title {
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-gray-900);
		margin: 0 0 var(--space-2) 0;
	}

	.signin-subtitle {
		font-size: var(--font-size-base);
		color: var(--color-gray-600);
		margin: 0;
	}

	.signin-options {
		margin-bottom: var(--space-8);
	}

	.already-signed-in {
		text-align: center;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		margin-bottom: var(--space-6);
		padding: var(--space-4);
		background-color: var(--color-green-50);
		border: 1px solid var(--color-green-200);
		border-radius: var(--border-radius);
	}

	.user-avatar {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		background-color: var(--color-green-100);
		color: var(--color-green-600);
		overflow: hidden;
	}

	.user-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.user-details h3 {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-gray-900);
		margin: 0 0 var(--space-1) 0;
	}

	.user-details p {
		font-size: var(--font-size-sm);
		color: var(--color-gray-600);
		margin: 0;
	}

	.auth-button-wrapper {
		display: flex;
		justify-content: center;
	}

	.signin-methods {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.signin-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-3);
		width: 100%;
		padding: var(--space-3) var(--space-4);
		border: var(--border-width) solid var(--color-gray-300);
		border-radius: var(--border-radius);
		background-color: var(--color-white);
		color: var(--color-gray-700);
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.signin-button:hover {
		background-color: var(--color-gray-50);
		border-color: var(--color-gray-400);
	}

	.signin-button:focus {
		outline: 2px solid var(--color-blue-500);
		outline-offset: 2px;
	}

	.google-signin {
		border-color: var(--color-gray-300);
	}

	.google-signin:hover {
		background-color: var(--color-gray-50);
		border-color: var(--color-gray-400);
	}

	.google-icon {
		flex-shrink: 0;
	}

	.signin-divider {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		margin: var(--space-4) 0;
	}

	.signin-divider::before,
	.signin-divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background-color: var(--color-gray-200);
	}

	.signin-divider span {
		font-size: var(--font-size-sm);
		color: var(--color-gray-500);
		font-weight: var(--font-weight-medium);
	}

	.signin-info {
		background-color: var(--color-blue-50);
		border: 1px solid var(--color-blue-200);
		border-radius: var(--border-radius);
		padding: var(--space-4);
	}

	.signin-info h3 {
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
		color: var(--color-gray-900);
		margin: 0 0 var(--space-3) 0;
	}

	.signin-info ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.signin-info li {
		font-size: var(--font-size-sm);
		color: var(--color-gray-600);
		margin-bottom: var(--space-2);
		padding-left: var(--space-4);
		position: relative;
	}

	.signin-info li::before {
		content: '✓';
		position: absolute;
		left: 0;
		color: var(--color-green-600);
		font-weight: var(--font-weight-bold);
	}

	.signin-footer {
		text-align: center;
	}

	.privacy-note {
		font-size: var(--font-size-xs);
		color: var(--color-gray-500);
		margin: 0;
		line-height: 1.5;
	}
</style>
