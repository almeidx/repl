<script lang="ts">
	import { getVersions, parseSpec, type PackageSpec } from '#lib/npm.js';
	import { runtime } from '#lib/runtime.svelte.js';
	import Combobox from './Combobox.svelte';

	/** Resolves `true` once the install is confirmed and queued. */
	let { oninstall }: { oninstall: (spec: PackageSpec) => Promise<boolean> } = $props();

	const MAX_SHOWN = 100;
	const LOOKUP_DEBOUNCE_MS = 300;

	let name = $state('');
	/** Empty means `latest`. */
	let version = $state('');
	let query = $state('');
	let versions = $state.raw<string[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);

	const trimmed = $derived(name.trim());
	const matches = $derived.by(() => {
		const needle = query.trim().toLowerCase();
		const all = ['latest', ...versions];
		return needle ? all.filter((entry) => entry.toLowerCase().includes(needle)) : all;
	});
	const installing = $derived(runtime.packages.filter((entry) => entry.status === 'installing').length);

	$effect(() => {
		const target = trimmed;
		versions = [];
		version = '';
		query = '';
		error = null;
		if (!parseSpec(target)) return;
		let stale = false;
		const timer = setTimeout(() => {
			loading = true;
			getVersions(target).then(
				(loaded) => {
					if (!stale) versions = loaded;
				},
				(caught: unknown) => {
					if (!stale) error = caught instanceof Error ? caught.message : String(caught);
				},
			).finally(() => {
				if (!stale) loading = false;
			});
		}, LOOKUP_DEBOUNCE_MS);
		return () => {
			stale = true;
			clearTimeout(timer);
			loading = false;
		};
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		const spec = parseSpec(trimmed, version);
		if (!spec) {
			error = 'Enter a valid package name and version, like lodash and 4.17.21.';
			return;
		}
		if (await oninstall(spec)) name = '';
	}
</script>

<div class="flex h-full flex-col">
	<h2 class="px-4 pt-3 text-xs font-medium text-muted">Packages</h2>

	<form class="flex flex-col gap-2 border-b border-border p-3" onsubmit={submit}>
		<label class="sr-only" for="package-name">Package name</label>
		<input
			id="package-name"
			class="h-8 rounded-lg border border-border bg-bg px-2.5 font-mono text-sm outline-none transition-colors placeholder:font-sans placeholder:text-faint focus:border-accent"
			placeholder="Package name"
			autocomplete="off"
			spellcheck="false"
			bind:value={name}
		/>
		<div class="flex gap-2">
			<Combobox
				id="package-version"
				label="Package version"
				class="flex-1"
				compact
				allowCustomValue
				items={matches.slice(0, MAX_SHOWN)}
				toValue={(entry) => entry}
				value={version}
				placeholder="latest"
				disabled={!trimmed}
				{loading}
				emptyText={loading ? 'Loading versions…' : 'No matching versions'}
				footer={matches.length > MAX_SHOWN ? `${matches.length - MAX_SHOWN} older versions, type to filter` : undefined}
				onQuery={(text) => {
					query = text;
					version = text.trim();
				}}
				onSelect={(selected) => {
					query = '';
					version = selected;
				}}
			>
				{#snippet item(entry, state)}
					<span class="font-mono text-sm" class:font-semibold={state.selected}>{entry}</span>
				{/snippet}
			</Combobox>
			<button type="submit" class="h-8 rounded-lg bg-accent px-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40" disabled={!trimmed}>
				Add
			</button>
		</div>
	</form>

	<div class="px-3 text-xs" aria-live="polite">
		{#if error}
			<p class="mt-2 rounded-lg border border-danger/30 bg-danger/10 px-2.5 py-1.5 text-danger">{error}</p>
		{:else if installing > 0}
			<p class="mt-2 text-muted">Installing {installing} {installing === 1 ? 'package' : 'packages'}…</p>
		{/if}
	</div>

	<ul class="min-h-0 flex-1 overflow-y-auto p-2" aria-label="Installed packages">
		{#each runtime.packages as entry (entry.name)}
			<li class="group flex h-8 items-center gap-2 rounded-md px-2 hover:bg-raised">
				<span class="min-w-0 flex-1 truncate font-mono text-sm">{entry.name}</span>
				{#if entry.status === 'installing'}
					<span class="spinner shrink-0 text-xs" aria-hidden="true"></span>
					<span class="sr-only">Installing</span>
				{:else if entry.status === 'error'}
					<span class="shrink-0 text-xs text-danger" title={entry.error}>failed</span>
				{:else}
					<span class="shrink-0 font-mono text-xs text-muted">{entry.version}</span>
				{/if}
				<button
					type="button"
					class="grid size-6 shrink-0 place-items-center rounded text-muted opacity-0 hover:bg-danger/15 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100 disabled:hidden"
					aria-label="Remove {entry.name}"
					title="Remove"
					disabled={entry.status === 'installing'}
					onclick={() => runtime.uninstall(entry.name)}
				>
					<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
						<path d="M4 4l8 8M12 4l-8 8" />
					</svg>
				</button>
			</li>
		{:else}
			<li class="px-2 py-1 text-xs text-faint">Nothing installed. Packages install into the sandbox when added.</li>
		{/each}
	</ul>
</div>
