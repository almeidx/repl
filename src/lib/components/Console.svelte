<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { theme } from '$lib/stores/theme'
	import { get } from 'svelte/store'

	let container: HTMLDivElement
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let terminal: any = null
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let fitAddon: any = null
	let unsubscribeTheme: (() => void) | null = null
	let resizeObserver: ResizeObserver | null = null
	let initPromise: Promise<void> | null = null
	let isMounted = false
	let pendingWrites: string[] = []
	let clearRequested = false
	let outputText = $state("")

	const MAX_OUTPUT_CHARS = 40_000

	const DARK_THEME = {
		background: '#1e1e1e',
		foreground: '#cccccc',
		cursor: '#cccccc',
		selectionBackground: '#264f78'
	}

	const LIGHT_THEME = {
		background: '#ffffff',
		foreground: '#1e1e1e',
		cursor: '#1e1e1e',
		selectionBackground: '#add6ff'
	}

	onMount(() => {
		isMounted = true

		return () => {
			isMounted = false
		}
	})

	onDestroy(() => {
		resizeObserver?.disconnect()
		resizeObserver = null
		terminal?.dispose()
		terminal = null
		unsubscribeTheme?.()
		unsubscribeTheme = null
		pendingWrites = []
	})

	export function write(data: string) {
		appendOutput(data)

		if (terminal) {
			terminal.write(data)
			return
		}

		pendingWrites.push(data)
		void ensureTerminal()
	}

	export function clear() {
		outputText = ""

		if (terminal) {
			terminal.clear()
			return
		}

		clearRequested = true
		pendingWrites = []
		void ensureTerminal()
	}

	async function ensureTerminal(): Promise<void> {
		if (terminal || !isMounted) return
		if (initPromise) {
			await initPromise
			return
		}

		initPromise = (async () => {
			const [{ Terminal }, { FitAddon }, { WebLinksAddon }] = await Promise.all([
				import('@xterm/xterm'),
				import('@xterm/addon-fit'),
				import('@xterm/addon-web-links')
			])
			await import('@xterm/xterm/css/xterm.css')

			if (!isMounted) return

			fitAddon = new FitAddon()

			terminal = new Terminal({
				theme: get(theme) === 'dark' ? DARK_THEME : LIGHT_THEME,
				fontSize: 13,
				fontFamily: 'Menlo, Monaco, "Courier New", monospace',
				cursorBlink: false,
				cursorStyle: 'block',
				scrollback: 10000,
				convertEol: true
			})

			terminal.loadAddon(fitAddon)
			terminal.loadAddon(new WebLinksAddon())
			terminal.open(container)
			fitAddon.fit()

			resizeObserver = new ResizeObserver(() => {
				fitAddon?.fit()
			})
			resizeObserver.observe(container)

			unsubscribeTheme = theme.subscribe(t => {
				if (terminal) {
					terminal.options.theme = t === 'dark' ? DARK_THEME : LIGHT_THEME
				}
			})

			if (clearRequested) {
				terminal.clear()
				clearRequested = false
			}

			if (pendingWrites.length > 0) {
				for (const chunk of pendingWrites) {
					terminal.write(chunk)
				}
				pendingWrites = []
			}
		})().finally(() => {
			initPromise = null
		})

		await initPromise
	}

	function appendOutput(chunk: string) {
		const plainText = chunk.replace(/\x1b\[[0-9;]*m/g, "")
		outputText = `${outputText}${plainText}`.slice(-MAX_OUTPUT_CHARS)
	}
</script>

<div class="h-full p-2 bg-bg-primary [&_.xterm]:h-full" bind:this={container}></div>
<pre class="sr-only" aria-live="polite" data-testid="console-output">{outputText}</pre>
