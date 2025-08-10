<script lang="ts">
	import TopBar from '$lib/components/TopBar.svelte';
	import FooterBar from '$lib/components/FooterBar.svelte';
</script>

<div class="flex min-h-screen flex-col">
	<TopBar title="ObservableHQ Clone" />

	<main class="flex-1 p-6">
		<div class="mx-auto max-w-4xl">
			<div class="py-12 text-center">
				<h1 class="mb-4 text-3xl font-bold text-gray-900">ObservableHQ Clone</h1>
				<p class="mb-8 text-lg text-gray-600">
					Your interactive notebook environment is ready. Use the controls below to start creating
					cells.
				</p>
				<div class="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8">
					<p class="mb-4 text-gray-500">No cells yet</p>
					<p class="text-sm text-gray-400">
						Click the "+" button in the footer to add your first cell
					</p>
				</div>
			</div>
		</div>
	</main>

	<FooterBar />
</div>
