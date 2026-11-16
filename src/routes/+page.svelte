<script lang="ts">
	import { browser } from '$app/env';
	import { goto } from '$app/navigation';
	import Console from '#lib/components/Console.svelte';
	import Editor from '#lib/components/Editor.svelte';
	import InstallDialog, { type InstallSource } from '#lib/components/InstallDialog.svelte';
	import PackagePanel from '#lib/components/PackagePanel.svelte';
	import SiteHeader from '#lib/components/SiteHeader.svelte';
	import Splitter from '#lib/components/Splitter.svelte';
	import type { PackageSpec } from '#lib/npm.js';
	import { runtime } from '#lib/runtime.svelte.js';
	import { decodeShare, encodeShare } from '#lib/share.js';
	import { onMount } from 'svelte';
	import { innerHeight } from 'svelte/reactivity/window';

	const HASH_DEBOUNCE_MS = 500;

	interface Command {
		label: string;
		key: string;
		/** Shift is required; other shortcuts ignore it (some layouts need Shift to type `.`). */
		shift?: boolean;
		action: () => unknown;
	}

	const commands = {
		run: { label: 'Run', key: 'Enter', action: run },
		stop: { label: 'Stop', key: '.', action: () => runtime.stop() },
		clear: { label: 'Clear console', key: 'K', action: () => terminal?.clear() },
		share: { label: 'Copy link', key: 'U', shift: true, action: share },
	} satisfies Record<string, Command>;

	const hint = ({ label, key, shift }: Command) => `${label} (Ctrl/⌘ + ${shift ? 'Shift + ' : ''}${key})`;

	const shared = browser ? decodeShare(location) : { code: null, packages: [] };
	let code = $state(shared.code ?? "console.log('Hello, world!')");
	/** Shared packages awaiting the install prompt; the link keeps them until the user decides. */
	let undecided = $state(shared.packages);
	/** What a link to this page carries: packages installed or still installing, plus undecided shared ones. */
	const linkPackages = $derived([...runtime.packages.filter((entry) => entry.status !== 'error'), ...undecided]);
	let terminal = $state<Console>();
	let dialog = $state<InstallDialog>();
	let notice = $state('');
	let noticeTimer: ReturnType<typeof setTimeout> | undefined;
	let packagesOpen = $state(false);
	let consoleHeight = $state(220);
	let sidebarWidth = $state(280);

	function notify(text: string) {
		notice = text;
		clearTimeout(noticeTimer);
		noticeTimer = setTimeout(() => (notice = ''), 2000);
	}

	function run() {
		if (terminal) void runtime.run(code, terminal);
	}

	async function share() {
		const hash = encodeShare(code, linkPackages);
		if (hash === null) return notify('Code is too large to share');
		try {
			await navigator.clipboard.writeText(`${location.origin}${location.pathname}#${hash}`);
			notify('Link copied');
		} catch {
			notify('Could not copy the link');
		}
	}

	async function install(source: InstallSource, specs: PackageSpec[]): Promise<boolean> {
		const decision = await dialog!.confirm(source, specs);
		if (!decision) return false;
		for (const spec of specs) void runtime.install(spec, decision);
		return true;
	}

	onMount(() => {
		if (shared.packages.length > 0) {
			void install('share', shared.packages).then((confirmed) => {
				undecided = [];
				if (!confirmed) notify('Shared packages skipped');
			});
		}
		return () => clearTimeout(noticeTimer);
	});

	$effect(() => {
		const hash = encodeShare(code, linkPackages);
		if (hash === null) return;
		const timer = setTimeout(() => {
			if (location.hash.slice(1) !== hash) void goto(`#${hash}`, { shallow: true, replace: true });
		}, HASH_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	});

	function onkeydown(event: KeyboardEvent) {
		if (!(event.metaKey || event.ctrlKey) || dialog?.isOpen()) return;
		const key = event.key.toLowerCase();
		const command = Object.values(commands).find(
			(entry: Command) => entry.key.toLowerCase() === key && (!entry.shift || event.shiftKey),
		);
		if (!command) return;
		// Capture phase: these win over the editor's own bindings for the same keys.
		event.preventDefault();
		event.stopPropagation();
		void command.action();
	}
</script>

<svelte:head>
	<title>repl · TypeScript in your browser</title>
	<meta name="description" content="Run TypeScript and JavaScript with npm packages in a Node.js sandbox that lives in your browser tab." />
</svelte:head>

<svelte:window
	onkeydowncapture={onkeydown}
	onkeydown={(event) => {
		// Bubble phase, so an open version list closes first.
		if (event.key === 'Escape' && !event.defaultPrevented) packagesOpen = false;
	}}
/>

<div class="flex h-dvh flex-col">
	<SiteHeader>
		{#if runtime.status === 'running'}
			<button
				type="button"
				class="flex h-8 items-center gap-2 rounded-lg bg-danger px-3 text-sm font-semibold text-white hover:opacity-90"
				title={hint(commands.stop)}
				onclick={commands.stop.action}
			>
				<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true"><rect width="10" height="10" rx="1.5" /></svg>
				Stop
			</button>
		{:else}
			<button
				type="button"
				class="flex h-8 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
				title={hint(commands.run)}
				disabled={runtime.busy}
				onclick={run}
			>
				{#if runtime.busy}
					<span class="spinner text-xs" aria-hidden="true"></span>
				{:else}
					<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true"><path d="M1 0.8v8.4a.6.6 0 00.9.5l7-4.2a.6.6 0 000-1L1.9.3a.6.6 0 00-.9.5z" /></svg>
				{/if}
				Run
			</button>
		{/if}
		<p class="truncate text-xs text-muted" aria-live="polite">
			{#if runtime.status === 'booting'}
				Starting Node.js…
			{:else if runtime.status === 'installing'}
				Installing packages…
			{:else if runtime.status === 'error'}
				<span class="text-danger">Sandbox failed to start</span>
			{/if}
		</p>

		{#snippet actions()}
			<p class="text-xs text-muted max-sm:sr-only" aria-live="polite">{notice}</p>
			<button
				type="button"
				class="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-muted transition-colors hover:bg-raised hover:text-fg"
				title={hint(commands.share)}
				onclick={share}
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7" />
				</svg>
				<span class="max-sm:sr-only">Share</span>
			</button>
			<button
				type="button"
				class="grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-raised hover:text-fg md:hidden"
				aria-label="Packages"
				aria-expanded={packagesOpen}
				aria-controls="packages"
				onclick={() => (packagesOpen = !packagesOpen)}
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">
					<path d="M12 2l9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10" />
				</svg>
			</button>
		{/snippet}
	</SiteHeader>

	<div class="flex min-h-0 flex-1">
		<main class="flex min-w-0 flex-1 flex-col">
			<Editor bind:value={code} packages={runtime.installed} />
			<Splitter label="Resize console" orientation="horizontal" bind:value={consoleHeight} min={80} max={(innerHeight.current ?? 0) - 160} />
			<section class="shrink-0" style:height="{consoleHeight}px" aria-label="Console">
				<Console bind:this={terminal} />
			</section>
		</main>

		<Splitter label="Resize packages" orientation="vertical" bind:value={sidebarWidth} min={200} max={480} class="max-md:hidden" />

		{#if packagesOpen}
			<button type="button" class="fixed inset-0 z-40 bg-black/50 md:hidden" aria-label="Close packages" onclick={() => (packagesOpen = false)}></button>
		{/if}
		<aside
			id="packages"
			aria-label="Packages"
			class={[
				'shrink-0 bg-surface md:w-(--width)',
				'max-md:fixed max-md:inset-y-0 max-md:right-0 max-md:z-50 max-md:w-[min(20rem,85vw)] max-md:border-l max-md:border-border max-md:shadow-xl',
				!packagesOpen && 'max-md:hidden',
			]}
			style:--width="{sidebarWidth}px"
		>
			<PackagePanel oninstall={(spec) => install('manual', [spec])} />
		</aside>
	</div>
</div>

<InstallDialog bind:this={dialog} />
