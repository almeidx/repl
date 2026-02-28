<script lang="ts">
	import { onMount } from "svelte";
	import Toolbar from "$lib/components/Toolbar.svelte";
	import Editor from "$lib/components/Editor.svelte";
	import Console from "$lib/components/Console.svelte";
	import PackageSidebar from "$lib/components/PackageSidebar.svelte";
	import ConfirmInstallDialog from "$lib/components/ui/ConfirmInstallDialog.svelte";
	import { containerState, runCode, stopExecution } from "$lib/utils/webcontainer";
	import { packages, installPackage, removePackage } from "$lib/stores/packages";
	import { theme, initTheme, toggleTheme } from "$lib/stores/theme";
	import { encodeShareUrl, decodeShareUrl, updateUrlHash, parsePackagesFromUrl } from "$lib/utils/sharing";
	import { getShortcutAction, shouldIgnoreGlobalShortcuts } from "$lib/utils/shortcuts";
	import {
		clampConsoleHeight,
		clampSidebarWidth,
		getResizedConsoleHeight,
		getResizedSidebarWidth,
	} from "$lib/utils/layout";
	import { validatePackageSpec, type ValidatedPackageSpec } from "$lib/utils/validation";

	interface InstallDialogResult {
		allowScripts: boolean;
	}

	let code = $state(`console.log('Hello, world!')`);
	let hashUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
	let shareStatusTimeout: ReturnType<typeof setTimeout> | null = null;
	let consoleRef: Console | null = $state(null);
	let pendingConsoleOutput = $state<string[]>([]);
	let shareStatus = $state<string | null>(null);
	let initializedFromUrl = $state(false);

	let consoleHeight = $state(200);
	let sidebarWidth = $state(260);
	let isResizingConsole = $state(false);
	let isResizingSidebar = $state(false);
	let isResizingBoth = $state(false);
	let showMobilePackages = $state(false);

	let installDialogOpen = $state(false);
	let installDialogSource = $state<"manual" | "share">("manual");
	let installDialogPackages = $state<ValidatedPackageSpec[]>([]);
	let installDialogResolver: ((result: InstallDialogResult | null) => void) | null = null;
	let installDialogPromiseQueue: Promise<void> = Promise.resolve();

	const isResizing = $derived(isResizingConsole || isResizingSidebar || isResizingBoth);
	const RESIZE_STEP = 16;

	onMount(() => {
		initTheme();

		const decoded = decodeShareUrl();
		if (decoded?.code) {
			code = decoded.code;
		}

		const initialPackages = new Map<string, string>();
		decoded?.packages?.forEach((pkg) => {
			initialPackages.set(pkg.name, pkg.version);
		});

		// Keep compatibility with legacy ?pkg= links while avoiding duplicate installs.
		const legacyQueryPackages = parsePackagesFromUrl();
		legacyQueryPackages.forEach((pkg) => {
			if (!initialPackages.has(pkg.name)) {
				initialPackages.set(pkg.name, pkg.version);
			}
		});

		const requestedPackages = [...initialPackages.entries()]
			.map(([name, version]) => validatePackageSpec(name, version))
			.filter((pkg): pkg is NonNullable<typeof pkg> => pkg !== null);

		if (requestedPackages.length > 0) {
			void queueInstallPrompt("share", requestedPackages).then(async (decision) => {
				if (!decision) {
					setShareStatus("Skipped share package install");
					return;
				}

				for (const pkg of requestedPackages) {
					await installPackage(pkg.name, pkg.version, {
						allowScripts: decision.allowScripts,
						source: "share",
					});
				}
			});
		}

		initializedFromUrl = true;

		return () => {
			if (hashUpdateTimeout) clearTimeout(hashUpdateTimeout);
			if (shareStatusTimeout) clearTimeout(shareStatusTimeout);
			resolveInstallDialog(null);
		};
	});

	$effect(() => {
		if (!initializedFromUrl) return;
		const currentCode = code;
		const currentPackages = $packages;

		if (hashUpdateTimeout) clearTimeout(hashUpdateTimeout);
		hashUpdateTimeout = setTimeout(() => {
			updateUrlHash(currentCode, currentPackages);
		}, 500);
	});

	$effect(() => {
		if (!consoleRef || pendingConsoleOutput.length === 0) return;

		for (const chunk of pendingConsoleOutput) {
			consoleRef.write(chunk);
		}
		pendingConsoleOutput = [];
	});

	function writeToConsole(data: string) {
		if (consoleRef) {
			consoleRef.write(data);
			return;
		}
		pendingConsoleOutput = [...pendingConsoleOutput, data];
	}

	function clearConsole() {
		if (consoleRef) {
			consoleRef.clear();
		}
		pendingConsoleOutput = [];
	}

	function handleRun() {
		clearConsole();
		void runCode(code, writeToConsole).catch((error) => {
			writeToConsole(`\n\x1b[31mError: ${error instanceof Error ? error.message : "Unknown error"}\x1b[0m\n`);
		});
	}

	function handleStop() {
		stopExecution();
	}

	function setShareStatus(message: string) {
		shareStatus = message;
		if (shareStatusTimeout) clearTimeout(shareStatusTimeout);
		shareStatusTimeout = setTimeout(() => {
			shareStatus = null;
		}, 2000);
	}

	async function handleShare() {
		try {
			const url = encodeShareUrl(code, $packages);
			await navigator.clipboard.writeText(url);
			setShareStatus("Share URL copied");
		} catch (error) {
			if (error instanceof RangeError) {
				setShareStatus("Code is too large to share");
				return;
			}
			setShareStatus("Failed to copy share URL");
		}
	}

	function handleClearConsole() {
		clearConsole();
	}

	function handleKeydown(event: KeyboardEvent) {
		const action = getShortcutAction(event, showMobilePackages);
		if (!action) return;
		if (action !== "closeMobilePackages" && shouldIgnoreGlobalShortcuts(event.target)) return;

		event.preventDefault();

		if (action === "closeMobilePackages") {
			showMobilePackages = false;
			return;
		}

		if (action === "run") {
			const status = $containerState.status;
			if (status === "ready" || status === "idle") handleRun();
			return;
		}

		if (action === "stop") {
			handleStop();
			return;
		}

		if (action === "clearConsole") {
			handleClearConsole();
			return;
		}

		if (action === "share") {
			void handleShare();
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

	function handleMouseMove(event: MouseEvent) {
		if (isResizingConsole || isResizingBoth) {
			consoleHeight = getResizedConsoleHeight(window.innerHeight, event.clientY);
		}
		if (isResizingSidebar || isResizingBoth) {
			sidebarWidth = getResizedSidebarWidth(window.innerWidth, event.clientX);
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

	function adjustConsoleHeight(delta: number) {
		consoleHeight = clampConsoleHeight(consoleHeight + delta, window.innerHeight);
	}

	function adjustSidebarWidth(delta: number) {
		sidebarWidth = clampSidebarWidth(sidebarWidth + delta);
	}

	function handleConsoleResizeKeydown(event: KeyboardEvent) {
		if (event.key === "ArrowUp") {
			event.preventDefault();
			adjustConsoleHeight(RESIZE_STEP);
		} else if (event.key === "ArrowDown") {
			event.preventDefault();
			adjustConsoleHeight(-RESIZE_STEP);
		}
	}

	function handleSidebarResizeKeydown(event: KeyboardEvent) {
		if (event.key === "ArrowLeft") {
			event.preventDefault();
			adjustSidebarWidth(RESIZE_STEP);
		} else if (event.key === "ArrowRight") {
			event.preventDefault();
			adjustSidebarWidth(-RESIZE_STEP);
		}
	}

	function handleBothResizeKeydown(event: KeyboardEvent) {
		if (event.key === "ArrowUp") {
			event.preventDefault();
			adjustConsoleHeight(RESIZE_STEP);
			return;
		}
		if (event.key === "ArrowDown") {
			event.preventDefault();
			adjustConsoleHeight(-RESIZE_STEP);
			return;
		}
		if (event.key === "ArrowLeft") {
			event.preventDefault();
			adjustSidebarWidth(RESIZE_STEP);
			return;
		}
		if (event.key === "ArrowRight") {
			event.preventDefault();
			adjustSidebarWidth(-RESIZE_STEP);
		}
	}

	async function handleInstallRequest(name: string, version: string): Promise<void> {
		const validated = validatePackageSpec(name, version);
		if (!validated) {
			throw new Error("Invalid package name or version");
		}

		const decision = await queueInstallPrompt("manual", [validated]);
		if (!decision) return;

		await installPackage(validated.name, validated.version, {
			allowScripts: decision.allowScripts,
			source: "manual",
		});
	}

	function queueInstallPrompt(
		source: "manual" | "share",
		requestedPackages: ValidatedPackageSpec[],
	): Promise<InstallDialogResult | null> {
		return new Promise((resolve) => {
			const enqueue = async () => {
				const result = await openInstallDialog(source, requestedPackages);
				resolve(result);
			};
			const queued = installDialogPromiseQueue.then(enqueue, enqueue);
			installDialogPromiseQueue = queued.then(
				() => undefined,
				() => undefined,
			);
		});
	}

	function openInstallDialog(
		source: "manual" | "share",
		requestedPackages: ValidatedPackageSpec[],
	): Promise<InstallDialogResult | null> {
		resolveInstallDialog(null);

		installDialogSource = source;
		installDialogPackages = requestedPackages;
		installDialogOpen = true;

		return new Promise((resolve) => {
			installDialogResolver = resolve;
		});
	}

	function resolveInstallDialog(result: InstallDialogResult | null): void {
		if (!installDialogResolver) return;
		const resolver = installDialogResolver;
		installDialogResolver = null;
		installDialogOpen = false;
		resolver(result);
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
		sharestatus={shareStatus}
		theme={$theme}
		ontoggletheme={toggleTheme}
		ontogglepackages={toggleMobilePackages}
	/>

	<div class="flex flex-col flex-1 overflow-hidden">
		<div class="flex flex-1 min-h-0">
			<Editor bind:value={code} />
			<button
				type="button"
				class="w-1 bg-border cursor-col-resize shrink-0 hover:bg-accent hidden md:block p-0 rounded-none border-0"
				aria-label="Resize package sidebar"
				onmousedown={startResizeSidebar}
				onkeydown={handleSidebarResizeKeydown}
			></button>
			<div class="hidden md:contents">
				<PackageSidebar
					instanceid="desktop-packages"
					packages={$packages}
					oninstall={handleInstallRequest}
					onremove={removePackage}
					width={sidebarWidth}
				/>
			</div>
		</div>

		<div class="flex shrink-0">
			<button
				type="button"
				class="h-1 bg-border cursor-row-resize flex-1 hover:bg-accent p-0 rounded-none border-0"
				aria-label="Resize console height"
				onmousedown={startResizeConsole}
				onkeydown={handleConsoleResizeKeydown}
			></button>
			<button
				type="button"
				class="h-1 bg-border cursor-nwse-resize shrink-0 hover:bg-accent hidden md:block p-0 rounded-none border-0"
				aria-label="Resize console and sidebar"
				style="width: {sidebarWidth + 4}px"
				onmousedown={startResizeBoth}
				onkeydown={handleBothResizeKeydown}
			></button>
		</div>

		<div class="min-h-[50px]" style="height: {consoleHeight}px">
			<Console bind:this={consoleRef} />
		</div>
	</div>

	{#if showMobilePackages}
		<button
			type="button"
			class="fixed inset-0 bg-black/50 z-[100] md:hidden border-0 p-0 m-0 rounded-none"
			onclick={toggleMobilePackages}
			aria-label="Close packages panel"
		></button>
		<div
			class="fixed top-0 right-0 bottom-0 w-[min(300px,80vw)] z-[101] bg-bg-secondary shadow-[-2px_0_8px_rgba(0,0,0,0.2)] md:hidden"
			role="dialog"
			aria-modal="true"
			aria-label="Packages panel"
		>
			<PackageSidebar instanceid="mobile-packages" packages={$packages} oninstall={handleInstallRequest} onremove={removePackage} />
		</div>
	{/if}
</div>

<ConfirmInstallDialog
	id="confirm-install-dialog"
	open={installDialogOpen}
	source={installDialogSource}
	packages={installDialogPackages}
	onconfirm={(allowScripts) => resolveInstallDialog({ allowScripts })}
	oncancel={() => resolveInstallDialog(null)}
/>

<style>
	.resizing :global(*) {
		pointer-events: none;
	}
</style>
