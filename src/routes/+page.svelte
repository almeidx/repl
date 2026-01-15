<script lang="ts">
	import { onMount } from "svelte";
	import Toolbar from "$lib/components/Toolbar.svelte";
	import Editor from "$lib/components/Editor.svelte";
	import Console from "$lib/components/Console.svelte";
	import PackageSidebar from "$lib/components/PackageSidebar.svelte";
	import { containerState, runCode, stopExecution } from "$lib/utils/webcontainer";
	import { packages, installPackage, removePackage } from "$lib/stores/packages";
	import { theme, initTheme, toggleTheme } from "$lib/stores/theme";
	import { encodeShareUrl, decodeShareUrl, updateUrlHash, parsePackagesFromUrl } from "$lib/utils/sharing";

	let code = $state(`console.log('Hello, world!')`);
	let hashUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
	let consoleRef: Console | null = $state(null);

	let consoleHeight = $state(200);
	let sidebarWidth = $state(260);
	let isResizingConsole = $state(false);
	let isResizingSidebar = $state(false);
	let isResizingBoth = $state(false);

	onMount(() => {
		initTheme();

		const decoded = decodeShareUrl();
		if (decoded) {
			code = decoded.code;
			if (decoded.packages) {
				decoded.packages.forEach((pkg) => installPackage(pkg.name, pkg.version));
			}
		}

		const urlPackages = parsePackagesFromUrl();
		urlPackages.forEach((pkg) => installPackage(pkg.name, pkg.version));

		return () => {
			if (hashUpdateTimeout) clearTimeout(hashUpdateTimeout);
		};
	});

	$effect(() => {
		const currentCode = code;
		const currentPackages = $packages;

		if (hashUpdateTimeout) clearTimeout(hashUpdateTimeout);
		hashUpdateTimeout = setTimeout(() => {
			updateUrlHash(currentCode, currentPackages);
		}, 500);
	});

	function handleRun() {
		consoleRef?.clear();
		runCode(code, (data) => consoleRef?.write(data));
	}

	function handleStop() {
		stopExecution();
	}

	function handleShare() {
		const url = encodeShareUrl(code, $packages);
		navigator.clipboard.writeText(url);
	}

	function handleClearConsole() {
		consoleRef?.clear();
	}

	function handleKeydown(e: KeyboardEvent) {
		const isMeta = e.metaKey || e.ctrlKey;

		if (isMeta && e.key === "Enter") {
			e.preventDefault();
			if ($containerState.status === "ready") handleRun();
		} else if (isMeta && e.key === ".") {
			e.preventDefault();
			handleStop();
		} else if (isMeta && e.key === "k") {
			e.preventDefault();
			handleClearConsole();
		} else if (isMeta && e.shiftKey && e.key === "C") {
			e.preventDefault();
			handleShare();
		}
	}

	function startResizeConsole() {
		isResizingConsole = true;
	}

	function startResizeSidebar() {
		isResizingSidebar = true;
	}

	function startResizeBoth() {
		isResizingBoth = true;
	}

	function handleMouseMove(e: MouseEvent) {
		if (isResizingConsole || isResizingBoth) {
			const newHeight = window.innerHeight - e.clientY;
			consoleHeight = Math.max(50, Math.min(newHeight, window.innerHeight - 150));
		}
		if (isResizingSidebar || isResizingBoth) {
			const newWidth = window.innerWidth - e.clientX;
			sidebarWidth = Math.max(200, Math.min(newWidth, 400));
		}
	}

	function handleMouseUp() {
		isResizingConsole = false;
		isResizingSidebar = false;
		isResizingBoth = false;
	}
</script>

<svelte:window onkeydown={handleKeydown} onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

<div class="app" class:resizing={isResizingConsole || isResizingSidebar || isResizingBoth}>
	<Toolbar
		state={$containerState}
		onrun={handleRun}
		onstop={handleStop}
		onshare={handleShare}
		theme={$theme}
		ontoggletheme={toggleTheme}
	/>

	<div class="main">
		<div class="editor-area">
			<Editor bind:value={code} />
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="resize-handle-v" onmousedown={startResizeSidebar}></div>
			<PackageSidebar packages={$packages} oninstall={installPackage} onremove={removePackage} width={sidebarWidth} />
		</div>

		<div class="resize-row">
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="resize-handle-h" onmousedown={startResizeConsole}></div>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="resize-handle-corner" onmousedown={startResizeBoth} style="width: {sidebarWidth + 4}px"></div>
		</div>

		<div class="console-area" style="height: {consoleHeight}px">
			<Console bind:this={consoleRef} />
		</div>
	</div>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background-color: var(--bg-primary);
	}

	.app.resizing {
		cursor: row-resize;
		user-select: none;
	}

	.app.resizing :global(*) {
		pointer-events: none;
	}

	.main {
		display: flex;
		flex-direction: column;
		flex: 1;
		overflow: hidden;
	}

	.editor-area {
		display: flex;
		flex: 1;
		min-height: 0;
	}

	.console-area {
		min-height: 50px;
	}

	.resize-row {
		display: flex;
		flex-shrink: 0;
	}

	.resize-handle-h {
		height: 4px;
		background-color: var(--border-color);
		cursor: row-resize;
		flex: 1;
	}

	.resize-handle-h:hover {
		background-color: var(--accent-color);
	}

	.resize-handle-corner {
		height: 4px;
		background-color: var(--border-color);
		cursor: nwse-resize;
		flex-shrink: 0;
	}

	.resize-handle-corner:hover {
		background-color: var(--accent-color);
	}

	.resize-handle-v {
		width: 4px;
		background-color: var(--border-color);
		cursor: col-resize;
		flex-shrink: 0;
	}

	.resize-handle-v:hover {
		background-color: var(--accent-color);
	}
</style>
