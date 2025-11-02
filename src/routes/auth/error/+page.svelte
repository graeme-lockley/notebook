<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let errorMessage = '';

	onMount(() => {
		const urlParams = new URLSearchParams($page.url.search);
		errorMessage = urlParams.get('message') || 'An authentication error occurred';
	});
</script>

<div class="error-container">
	<div class="error-card">
		<h1>Authentication Error</h1>
		<p class="error-message">{errorMessage}</p>
		<div class="error-actions">
			<a href="/" class="btn btn-primary">Go Home</a>
			<a href="/auth/google" class="btn btn-secondary">Try Again</a>
		</div>
	</div>
</div>

<style>
	.error-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		padding: 1rem;
		background-color: #f8f9fa;
	}

	.error-card {
		background: white;
		border-radius: 8px;
		padding: 2rem;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		max-width: 500px;
		width: 100%;
		text-align: center;
	}

	h1 {
		color: #dc3545;
		margin-bottom: 1rem;
		font-size: 1.5rem;
	}

	.error-message {
		color: #6c757d;
		margin-bottom: 2rem;
		line-height: 1.5;
	}

	.error-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border-radius: 4px;
		text-decoration: none;
		font-weight: 500;
		transition: all 0.2s;
		border: none;
		cursor: pointer;
		display: inline-block;
	}

	.btn-primary {
		background-color: #007bff;
		color: white;
	}

	.btn-primary:hover {
		background-color: #0056b3;
	}

	.btn-secondary {
		background-color: #6c757d;
		color: white;
	}

	.btn-secondary:hover {
		background-color: #545b62;
	}
</style>
