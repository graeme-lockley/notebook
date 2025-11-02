<script lang="ts">
	import TopBar from '$lib/components/TopBar.svelte';
	import FooterBar from '$lib/components/FooterBar.svelte';
	import { goto } from '$app/navigation';
	import { User, ArrowRight } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function goToSignIn() {
		goto('/auth/signin');
	}

	function goToDemo() {
		goto('/demo');
	}
</script>

<div class="flex min-h-screen flex-col">
	<TopBar
		title="ObservableHQ Clone"
		user={data.user
			? {
					...data.user,
					createdAt: new Date(data.user.createdAt),
					lastLoginAt: new Date(data.user.lastLoginAt)
				}
			: null}
		isAuthenticated={data.isAuthenticated}
	/>

	<main class="p-6 flex-1">
		<div class="max-w-4xl mx-auto">
			<div class="py-12 text-center">
				<h1 class="mb-4 text-3xl font-bold text-gray-900">ObservableHQ Clone</h1>
				<p class="mb-8 text-lg text-gray-600">
					Your interactive notebook environment is ready. Check out the demo to see the Cell System
					in action.
				</p>

				{#if data.isAuthenticated && data.user}
					<!-- Authenticated user content -->
					<div class="space-y-4">
						<div class="welcome-message">
							<div class="user-avatar">
								{#if data.user.picture}
									<img src={data.user.picture} alt={data.user.name} />
								{:else}
									<User size={24} />
								{/if}
							</div>
							<div class="user-welcome">
								<h2 class="text-xl font-semibold text-gray-900">Welcome back, {data.user.name}!</h2>
								<p class="text-gray-600">Ready to create some amazing notebooks?</p>
							</div>
						</div>

						<!-- Recent Notebooks Section -->
						<div class="recent-notebooks-section">
							<h3 class="text-lg font-semibold text-gray-900 mb-3">Recent Notebooks</h3>
							{#if data.recentNotebooks && data.recentNotebooks.length > 0}
								<div class="notebook-list">
									{#each data.recentNotebooks as notebook (notebook.id)}
										<a
											href="/notebook/{notebook.id}"
											class="notebook-item"
											data-testid="recent-notebook-{notebook.id}"
										>
											<div class="notebook-title">{notebook.title || 'Untitled Notebook'}</div>
											{#if notebook.description}
												<div class="notebook-description">{notebook.description}</div>
											{/if}
										</a>
									{/each}
								</div>
							{:else}
								<div class="no-recent-notebooks">
									<p class="text-gray-500 text-sm">
										You haven't viewed any notebooks yet. Visit a notebook to see it here.
									</p>
								</div>
							{/if}
						</div>

						<div class="action-buttons">
							<button onclick={goToDemo} class="primary-button" data-testid="demo-button">
								<ArrowRight size={16} />
								<span>View Cell System Demo</span>
							</button>
						</div>

						<div class="feature-grid">
							<div class="feature-card">
								<h3>Create Notebooks</h3>
								<p>Build interactive notebooks with JavaScript, HTML, and Markdown cells</p>
							</div>
							<div class="feature-card">
								<h3>Real-time Collaboration</h3>
								<p>Work together with others in real-time using WebSocket connections</p>
							</div>
							<div class="feature-card">
								<h3>Event Sourcing</h3>
								<p>Complete audit trail of all changes with event-driven architecture</p>
							</div>
						</div>
					</div>
				{:else}
					<!-- Non-authenticated user content -->
					<div class="space-y-4">
						<div class="action-buttons">
							<button onclick={goToSignIn} class="primary-button" data-testid="signin-button">
								<User size={16} />
								<span>Sign In to Get Started</span>
							</button>

							<button onclick={goToDemo} class="secondary-button" data-testid="demo-button">
								<ArrowRight size={16} />
								<span>View Demo (No Sign-in Required)</span>
							</button>
						</div>

						<div class="info-card">
							<h3 class="text-lg font-semibold text-gray-900 mb-2">Why Sign In?</h3>
							<ul class="text-left text-gray-600 space-y-1">
								<li>• Save and sync your notebooks across devices</li>
								<li>• Collaborate with others in real-time</li>
								<li>• Access your notebooks from anywhere</li>
								<li>• Share notebooks with the community</li>
							</ul>
						</div>

						<div class="rounded-lg border-gray-300 bg-gray-50 p-8 border-2 border-dashed">
							<p class="mb-4 text-gray-500">Cell System Components Ready</p>
							<p class="text-sm text-gray-400">
								All Cell System components have been implemented and are ready for use
							</p>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</main>

	<FooterBar />
</div>

<style>
	.welcome-message {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-4);
		margin-bottom: var(--space-6);
		padding: var(--space-4);
		background-color: var(--color-blue-50);
		border: 1px solid var(--color-blue-200);
		border-radius: var(--border-radius);
	}

	.user-avatar {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		background-color: var(--color-blue-100);
		color: var(--color-blue-600);
		overflow: hidden;
	}

	.user-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.user-welcome h2 {
		margin: 0 0 var(--space-1) 0;
	}

	.user-welcome p {
		margin: 0;
	}

	.action-buttons {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin-bottom: var(--space-8);
	}

	.primary-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-6);
		background-color: var(--color-blue-600);
		color: var(--color-white);
		border: none;
		border-radius: var(--border-radius);
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition: background-color var(--transition-fast);
	}

	.primary-button:hover {
		background-color: var(--color-blue-700);
	}

	.primary-button:focus {
		outline: 2px solid var(--color-blue-500);
		outline-offset: 2px;
	}

	.secondary-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-6);
		background-color: transparent;
		color: var(--color-gray-700);
		border: 1px solid var(--color-gray-300);
		border-radius: var(--border-radius);
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.secondary-button:hover {
		background-color: var(--color-gray-50);
		border-color: var(--color-gray-400);
	}

	.secondary-button:focus {
		outline: 2px solid var(--color-blue-500);
		outline-offset: 2px;
	}

	.feature-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-4);
		margin-bottom: var(--space-8);
	}

	.feature-card {
		padding: var(--space-4);
		background-color: var(--color-white);
		border: 1px solid var(--color-gray-200);
		border-radius: var(--border-radius);
		text-align: left;
	}

	.feature-card h3 {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-gray-900);
		margin: 0 0 var(--space-2) 0;
	}

	.feature-card p {
		font-size: var(--font-size-sm);
		color: var(--color-gray-600);
		margin: 0;
		line-height: 1.5;
	}

	.info-card {
		padding: var(--space-4);
		background-color: var(--color-blue-50);
		border: 1px solid var(--color-blue-200);
		border-radius: var(--border-radius);
		margin-bottom: var(--space-6);
	}

	.info-card h3 {
		margin: 0 0 var(--space-3) 0;
	}

	.info-card ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.info-card li {
		margin-bottom: var(--space-1);
	}

	.recent-notebooks-section {
		margin-top: var(--space-6);
		margin-bottom: var(--space-4);
	}

	.notebook-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.notebook-item {
		display: block;
		padding: var(--space-3);
		border-radius: var(--border-radius);
		background-color: var(--color-white);
		border: var(--border-width) solid var(--color-gray-200);
		text-decoration: none;
		color: var(--color-gray-900);
		transition: all var(--transition-fast);
		cursor: pointer;
	}

	.notebook-item:hover {
		border-color: var(--color-blue-500);
		background-color: var(--color-blue-50);
		transform: translateX(4px);
	}

	.notebook-title {
		font-weight: var(--font-weight-medium);
		font-size: var(--font-size-base);
		color: var(--color-gray-900);
		margin-bottom: var(--space-1);
	}

	.notebook-description {
		font-size: var(--font-size-sm);
		color: var(--color-gray-600);
	}

	@media (min-width: 640px) {
		.action-buttons {
			flex-direction: row;
			justify-content: center;
		}
	}
</style>
