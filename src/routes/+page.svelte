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
	let showMobilePackages = $state(false);

	const isResizing = $derived(isResizingConsole || isResizingSidebar || isResizingBoth);

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

		if (e.key === "Escape" && showMobilePackages) {
			e.preventDefault();
			showMobilePackages = false;
		} else if (isMeta && e.key === "Enter") {
			e.preventDefault();
			const status = $containerState.status;
			if (status === "ready" || status === "idle") handleRun();
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

	function toggleMobilePackages() {
		showMobilePackages = !showMobilePackages;
	}
</script>

<svelte:window onkeydown={handleKeydown} onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

<div
	class="flex flex-col h-screen bg-bg-primary"
	class:cursor-row-resize={isResizing}
	class:select-none={isResizing}
	class:resizing={isResizing}
>
	<Toolbar
		state={$containerState}
		onrun={handleRun}
		onstop={handleStop}
		onshare={handleShare}
		theme={$theme}
		ontoggletheme={toggleTheme}
		ontogglepackages={toggleMobilePackages}
	/>

	<div class="flex flex-col flex-1 overflow-hidden">
		<div class="flex flex-1 min-h-0">
			<Editor bind:value={code} />
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="w-1 bg-border cursor-col-resize shrink-0 hover:bg-accent hidden md:block"
				onmousedown={startResizeSidebar}
			></div>
			<div class="hidden md:contents">
				<PackageSidebar packages={$packages} oninstall={installPackage} onremove={removePackage} width={sidebarWidth} />
			</div>
		</div>

		<div class="flex shrink-0">
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="h-1 bg-border cursor-row-resize flex-1 hover:bg-accent"
				onmousedown={startResizeConsole}
			></div>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="h-1 bg-border cursor-nwse-resize shrink-0 hover:bg-accent hidden md:block"
				style="width: {sidebarWidth + 4}px"
				onmousedown={startResizeBoth}
			></div>
		</div>

		<div class="min-h-[50px]" style="height: {consoleHeight}px">
			<Console bind:this={consoleRef} />
		</div>
	</div>

	{#if showMobilePackages}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="fixed inset-0 bg-black/50 z-[100] md:hidden" onclick={toggleMobilePackages}></div>
		<div class="fixed top-0 right-0 bottom-0 w-[min(300px,80vw)] z-[101] bg-bg-secondary shadow-[-2px_0_8px_rgba(0,0,0,0.2)] md:hidden">
			<PackageSidebar packages={$packages} oninstall={installPackage} onremove={removePackage} />
		</div>
	{/if}
</div>

<style>
	.resizing :global(*) {
		pointer-events: none;
	}
</style>
