<script lang="ts">
	import { goto } from '$app/navigation';
	import Console from '#lib/components/Console.svelte';
	import Editor from '#lib/components/Editor.svelte';
	import InstallDialog from '#lib/components/InstallDialog.svelte';
	import PackagePanel from '#lib/components/PackagePanel.svelte';
	import SiteHeader from '#lib/components/SiteHeader.svelte';
	import type { PackageSpec } from '#lib/npm.js';
	import { red, runtime } from '#lib/runtime.svelte.js';
	import { decodeShare, encodeShare } from '#lib/share.js';
	import { onMount } from 'svelte';

	const HASH_DEBOUNCE_MS = 500;
	const RESIZE_STEP = 16;

	let code = $state("console.log('Hello, world!')");
	/** The hash is only rewritten once the shared link has been read. */
	let restored = $state(false);
	let terminal = $state<Console>();
	let dialog = $state<InstallDialog>();
	let notice = $state('');
	let noticeTimer: ReturnType<typeof setTimeout> | undefined;
	let packagesOpen = $state(false);
	let consoleHeight = $state(220);
	let sidebarWidth = $state(280);

	const installed = $derived(
		runtime.packages.filter((entry) => entry.status === 'installed').map(({ name, version }) => ({ name, version })),
	);
	const canRun = $derived(!runtime.busy);

	function notify(text: string) {
		notice = text;
		clearTimeout(noticeTimer);
		noticeTimer = setTimeout(() => (notice = ''), 2000);
	}

	function run() {
		if (!canRun) return;
		terminal?.clear();
		void runtime.run(code, (data) => terminal?.write(data));
	}

	async function share() {
		try {
			await navigator.clipboard.writeText(`${location.origin}${location.pathname}#${encodeShare(code, installed)}`);
			notify('Link copied');
		} catch (error) {
			notify(error instanceof RangeError ? error.message : 'Could not copy the link');
		}
	}

	async function install(source: 'manual' | 'share', specs: PackageSpec[]): Promise<boolean> {
		const decision = await dialog!.confirm(source, specs);
		if (!decision) return false;
		for (const spec of specs) void runtime.install(spec, decision);
		return true;
	}

	onMount(() => {
		const shared = decodeShare(location);
		if (shared.code !== null) code = shared.code;
		restored = true;
		if (shared.packages.length > 0) {
			void install('share', shared.packages).then((confirmed) => confirmed || notify('Shared packages skipped'));
		}
		return () => clearTimeout(noticeTimer);
	});

	$effect(() => {
		if (!restored) return;
		let hash: string;
		try {
			hash = encodeShare(code, installed);
		} catch {
			return; // Too large to share: keep the last shareable hash.
		}
		const timer = setTimeout(() => {
			if (location.hash.slice(1) !== hash) void goto(`#${hash}`, { shallow: true, replace: true });
		}, HASH_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	});

	function onkeydown(event: KeyboardEvent) {
		if (!(event.metaKey || event.ctrlKey) || document.querySelector('dialog[open]')) return;
		const key = event.key.toLowerCase();
		const action =
			key === 'enter' ? run : key === '.' ? () => runtime.stop() : key === 'k' ? () => terminal?.clear() : event.shiftKey && key === 'u' ? share : null;
		if (!action) return;
		// Capture phase: these win over the editor's own bindings for the same keys.
		event.preventDefault();
		event.stopPropagation();
		void action();
	}

	const clampConsole = (height: number) => Math.round(Math.max(80, Math.min(height, innerHeight - 160)));
	const clampSidebar = (width: number) => Math.round(Math.max(200, Math.min(width, 480)));

	/** Pointer drag on a splitter; capture keeps events flowing over the editor while dragging. */
	function drag(event: PointerEvent, apply: (event: PointerEvent) => void) {
		if (event.button !== 0) return;
		event.preventDefault();
		const handle = event.currentTarget as HTMLElement;
		handle.setPointerCapture(event.pointerId);
		handle.addEventListener('pointermove', apply);
		handle.addEventListener('lostpointercapture', () => handle.removeEventListener('pointermove', apply), { once: true });
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
				title="Stop (Ctrl/⌘ + .)"
				onclick={() => runtime.stop()}
			>
				<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true"><rect width="10" height="10" rx="1.5" /></svg>
				Stop
			</button>
		{:else}
			<button
				type="button"
				class="flex h-8 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
				title="Run (Ctrl/⌘ + Enter)"
				disabled={!canRun}
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
				title="Copy link (Ctrl/⌘ + Shift + U)"
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
			<Editor bind:value={code} />
			<!-- A focusable separator is the ARIA window-splitter pattern; Svelte's a11y rules treat it as static. -->
			<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
			<div
				role="separator"
				tabindex="0"
				aria-label="Resize console"
				aria-orientation="horizontal"
				aria-valuenow={consoleHeight}
				aria-valuemin={80}
				class="h-1 shrink-0 cursor-row-resize border-t border-border transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
				onpointerdown={(event) => drag(event, (move) => (consoleHeight = clampConsole(innerHeight - move.clientY)))}
				onkeydown={(event) => {
					const delta = event.key === 'ArrowUp' ? RESIZE_STEP : event.key === 'ArrowDown' ? -RESIZE_STEP : 0;
					if (delta) consoleHeight = clampConsole(consoleHeight + delta);
				}}
			></div>
			<section class="shrink-0" style:height="{consoleHeight}px" aria-label="Console">
				<Console bind:this={terminal} />
			</section>
		</main>

		<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
		<div
			role="separator"
			tabindex="0"
			aria-label="Resize packages"
			aria-orientation="vertical"
			aria-valuenow={sidebarWidth}
			aria-valuemin={200}
			aria-valuemax={480}
			class="w-1 shrink-0 cursor-col-resize border-l border-border transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none max-md:hidden"
			onpointerdown={(event) => drag(event, (move) => (sidebarWidth = clampSidebar(innerWidth - move.clientX)))}
			onkeydown={(event) => {
				const delta = event.key === 'ArrowLeft' ? RESIZE_STEP : event.key === 'ArrowRight' ? -RESIZE_STEP : 0;
				if (delta) sidebarWidth = clampSidebar(sidebarWidth + delta);
			}}
		></div>

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
