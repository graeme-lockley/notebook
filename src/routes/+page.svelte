<script lang="ts">
	import TopBar from '$lib/components/TopBar.svelte';
	import FooterBar from '$lib/components/FooterBar.svelte';
</script>

<div class="flex min-h-screen flex-col">
	<TopBar title="ObservableHQ Clone" />

	<main class="p-6 flex-1">
		<div class="max-w-4xl mx-auto">
			<div class="py-12 text-center">
				<h1 class="mb-4 text-3xl font-bold text-gray-900">ObservableHQ Clone</h1>
				<p class="mb-8 text-lg text-gray-600">
					Your interactive notebook environment is ready. Check out the demo to see the Cell System
					in action.
				</p>
				<div class="space-y-4">
					<a
						href="/demo"
						class="rounded-md bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-700 focus:ring-blue-500 inline-flex items-center border border-transparent focus:ring-2 focus:ring-offset-2 focus:outline-none"
					>
						View Cell System Demo
					</a>
					<div class="rounded-lg border-gray-300 bg-gray-50 p-8 border-2 border-dashed">
						<p class="mb-4 text-gray-500">Cell System Components Ready</p>
						<p class="text-sm text-gray-400">
							All Cell System components have been implemented and are ready for use
						</p>
					</div>
				</div>
			</div>
		</div>
	</main>

	<FooterBar />
</div>
