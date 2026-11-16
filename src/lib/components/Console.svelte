<script lang="ts">
	import type { Terminal } from '@xterm/xterm';
	import { settings, surfaces, type Theme } from '#lib/settings.svelte.js';
	import { onMount, untrack } from 'svelte';

	let root: HTMLDivElement;
	let terminal = $state.raw<Terminal | null>(null);
	/** Output written before xterm finishes loading. */
	let pending: string[] = [];

	function terminalTheme(theme: Theme) {
		const { background, foreground, selection } = surfaces[theme];
		return { background, foreground, cursor: background, selectionBackground: selection };
	}

	export function write(data: string) {
		if (terminal) terminal.write(data);
		else pending.push(data);
	}

	export function clear() {
		pending = [];
		terminal?.reset();
	}

	onMount(() => {
		let disposed = false;
		let observer: ResizeObserver | undefined;
		let frame = 0;
		// Loaded after first paint; output is buffered in `pending` until then.
		void Promise.all([
			import('@xterm/xterm'),
			import('@xterm/addon-fit'),
			import('@xterm/addon-web-links'),
			import('@xterm/xterm/css/xterm.css'),
		]).then(([{ Terminal }, { FitAddon }, { WebLinksAddon }]) => {
			if (disposed) return;
			const created = new Terminal({
				theme: terminalTheme(untrack(() => settings.theme)),
				fontSize: 13,
				fontFamily: getComputedStyle(root).fontFamily,
				cursorStyle: 'bar',
				cursorInactiveStyle: 'none',
				disableStdin: true,
				scrollback: 10_000,
				convertEol: true,
			});
			const fit = new FitAddon();
			created.loadAddon(fit);
			created.loadAddon(new WebLinksAddon());
			created.open(root);
			fit.fit();
			observer = new ResizeObserver(() => {
				cancelAnimationFrame(frame);
				frame = requestAnimationFrame(() => fit.fit());
			});
			observer.observe(root);
			for (const chunk of pending) created.write(chunk);
			pending = [];
			terminal = created;
		});
		return () => {
			disposed = true;
			cancelAnimationFrame(frame);
			observer?.disconnect();
			terminal?.dispose();
			terminal = null;
		};
	});

	$effect(() => {
		if (terminal) terminal.options.theme = terminalTheme(settings.theme);
	});
</script>

<div bind:this={root} class="h-full min-h-0 px-3 py-2 font-mono [&_.xterm]:h-full"></div>
