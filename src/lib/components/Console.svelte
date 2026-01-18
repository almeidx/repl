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

	onMount(async () => {
		const [{ Terminal }, { FitAddon }, { WebLinksAddon }] = await Promise.all([
			import('@xterm/xterm'),
			import('@xterm/addon-fit'),
			import('@xterm/addon-web-links')
		])
		await import('@xterm/xterm/css/xterm.css')

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

		const resizeObserver = new ResizeObserver(() => {
			fitAddon?.fit()
		})
		resizeObserver.observe(container)

		unsubscribeTheme = theme.subscribe(t => {
			if (terminal) {
				terminal.options.theme = t === 'dark' ? DARK_THEME : LIGHT_THEME
			}
		})
	})

	onDestroy(() => {
		terminal?.dispose()
		unsubscribeTheme?.()
	})

	export function write(data: string) {
		terminal?.write(data)
	}

	export function clear() {
		terminal?.clear()
	}
</script>

<div class="h-full p-2 bg-bg-primary [&_.xterm]:h-full" bind:this={container}></div>
