<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { get } from "svelte/store";
	import { theme } from "$lib/stores/theme";
	import { packages, type Package } from "$lib/stores/packages";
	import { fetchPackageTypes } from "$lib/utils/types";
	import { loadMonaco } from "$lib/utils/monaco";

	interface Props {
		value: string;
	}

	type MonacoModule = Awaited<ReturnType<typeof loadMonaco>>;
	type MonacoEditor = import("monaco-editor/esm/vs/editor/editor.api").editor.IStandaloneCodeEditor;
	type MonacoDisposable = import("monaco-editor/esm/vs/editor/editor.api").IDisposable;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Monaco's TypeScript language API types are not exported from the ESM entry point
	type MonacoTsLanguage = {
		typescriptDefaults: any;
		ScriptTarget: any;
		ModuleResolutionKind: any;
		ModuleKind: any;
	};

	let { value = $bindable() }: Props = $props();

	let container = $state<HTMLDivElement | null>(null);
	let loadError = $state<string | null>(null);
	let editor: MonacoEditor | null = null;
	let monaco: MonacoModule | null = null;
	let unsubscribeTheme: (() => void) | null = null;
	let unsubscribePackages: (() => void) | null = null;
	const typeDisposables = new Map<string, MonacoDisposable>();
	const resolvedTypeVersions = new Map<string, string>();
	let typeSyncRunId = 0;
	let currentTheme = get(theme);

	onMount(async () => {
		unsubscribeTheme = theme.subscribe((nextTheme) => {
			currentTheme = nextTheme;
			if (monaco) {
				monaco.editor.setTheme(nextTheme === "dark" ? "vs-dark" : "vs");
			}
		});

		try {
			monaco = await loadMonaco();
		} catch (error) {
			loadError = error instanceof Error ? error.message : "Failed to load Monaco editor";
			return;
		}

		if (!monaco) {
			loadError = "Monaco failed to initialize";
			return;
		}

		const typescript = monaco.languages.typescript as unknown as MonacoTsLanguage | undefined;
		if (typescript?.typescriptDefaults) {
			typescript.typescriptDefaults.setCompilerOptions({
				target: typescript.ScriptTarget.ES2022,
				moduleResolution: typescript.ModuleResolutionKind.NodeJs,
				module: typescript.ModuleKind.ESNext,
				strict: true,
				esModuleInterop: true,
				skipLibCheck: true,
				allowSyntheticDefaultImports: true,
				noEmit: true,
			});

			typescript.typescriptDefaults.setDiagnosticsOptions({
				noSemanticValidation: false,
				noSyntaxValidation: false,
			});

			typescript.typescriptDefaults.setEagerModelSync(false);
		}

		if (!container) {
			loadError = "Editor container failed to initialize";
			return;
		}

		editor = monaco.editor.create(container, {
			value,
			language: typescript?.typescriptDefaults ? "typescript" : "javascript",
			theme: currentTheme === "dark" ? "vs-dark" : "vs",
			minimap: { enabled: false },
			fontSize: 14,
			lineNumbers: "on",
			scrollBeyondLastLine: false,
			automaticLayout: true,
			tabSize: 2,
			wordWrap: "on",
			padding: { top: 12 },
		});

		editor.onDidChangeModelContent(() => {
			value = editor?.getValue() ?? value;
		});

		unsubscribePackages = packages.subscribe((pkgs) => {
			void syncPackageTypes(pkgs);
		});

		void syncPackageTypes(get(packages));
	});

	onDestroy(() => {
		typeSyncRunId++;
		editor?.dispose();
		editor = null;
		unsubscribeTheme?.();
		unsubscribePackages?.();
		for (const disposable of typeDisposables.values()) {
			disposable.dispose();
		}
		typeDisposables.clear();
		resolvedTypeVersions.clear();
	});

	$effect(() => {
		if (!editor) return;
		if (editor.getValue() === value) return;
		editor.setValue(value);
	});

	async function syncPackageTypes(pkgs: Package[]): Promise<void> {
		if (!monaco) return;
		const typescript = monaco.languages.typescript as unknown as MonacoTsLanguage | undefined;
		if (!typescript?.typescriptDefaults) return;

		const runId = ++typeSyncRunId;
		const installedVersions = new Map<string, string>();
		for (const pkg of pkgs) {
			if (pkg.status === "installed") {
				installedVersions.set(pkg.name, pkg.version);
			}
		}

		for (const [name, disposable] of typeDisposables.entries()) {
			const nextVersion = installedVersions.get(name);
			if (!nextVersion || resolvedTypeVersions.get(name) !== nextVersion) {
				disposable.dispose();
				typeDisposables.delete(name);
			}
		}

		for (const [name, version] of resolvedTypeVersions.entries()) {
			if (!installedVersions.has(name) || installedVersions.get(name) !== version) {
				resolvedTypeVersions.delete(name);
			}
		}

		const needsFetch = [...installedVersions.entries()].filter(
			([name, version]) => resolvedTypeVersions.get(name) !== version,
		);

		if (needsFetch.length === 0) return;

		const fetchedTypes = await Promise.all(
			needsFetch.map(async ([name, version]) => {
				const types = await fetchPackageTypes(name, version);
				return { name, version, types };
			}),
		);

		if (runId !== typeSyncRunId || !monaco) return;

		for (const { name, version, types } of fetchedTypes) {
			if (installedVersions.get(name) !== version) continue;

			const previous = typeDisposables.get(name);
			previous?.dispose();
			typeDisposables.delete(name);

			if (types) {
				const disposable = typescript.typescriptDefaults.addExtraLib(
					types,
					`file:///node_modules/${name}/${version}/index.d.ts`,
				);
				typeDisposables.set(name, disposable);
			}

			resolvedTypeVersions.set(name, version);
		}
	}
</script>

{#if loadError}
	<div class="flex-1 min-w-0 h-full p-4 bg-bg-primary text-error">
		{loadError}. Check your network connection and refresh.
	</div>
{:else}
	<div class="flex-1 min-w-0 h-full" bind:this={container}></div>
{/if}
