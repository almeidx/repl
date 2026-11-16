<script lang="ts">
	import { page } from '$app/state';
	import SiteHeader from '#lib/components/SiteHeader.svelte';
</script>

<svelte:head>
	<title>{page.status} · repl</title>
</svelte:head>

<div class="flex h-dvh flex-col">
	<SiteHeader />
	<main class="grid flex-1 place-items-center p-6 text-center">
		<div>
			<h1 class="text-5xl font-semibold tracking-tight">{page.status}</h1>
			<p class="mt-3 text-muted">{page.error?.message || 'Something went wrong'}</p>
			<a href="/" class="mt-6 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Open the REPL</a>
		</div>
	</main>
</div>
