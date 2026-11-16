<script lang="ts">
	import type { editor, IDisposable } from 'monaco-editor/editor';
	import { applyTheme, loadMonaco, type LoadedMonaco } from '#lib/monaco.js';
	import { getTypes, type PackageSpec } from '#lib/npm.js';
	import { settings } from '#lib/settings.svelte.js';
	import { onMount, untrack } from 'svelte';

	/** `value` is read once on mount, then kept in sync with the editor's contents. */
	let { value = $bindable(), packages }: { value: string; packages: readonly PackageSpec[] } = $props();

	let root: HTMLDivElement;
	let loaded = $state.raw<LoadedMonaco | null>(null);
	let error = $state<string | null>(null);
	/** Declarations of installed packages, keyed by `name@version`; a no-op placeholder while loading. */
	const libs = new Map<string, IDisposable>();

	onMount(() => {
		let disposed = false;
		let instance: editor.IStandaloneCodeEditor | undefined;
		loadMonaco().then(
			(result) => {
				if (disposed) return;
				loaded = result;
				const created = result.monaco.editor.create(root, {
					value: untrack(() => value),
					language: 'typescript',
					fontSize: 14,
					tabSize: 2,
					wordWrap: 'on',
					minimap: { enabled: false },
					scrollBeyondLastLine: false,
					automaticLayout: true,
					padding: { top: 12 },
				});
				created.onDidChangeModelContent(() => (value = created.getValue()));
				instance = created;
			},
			(caught: unknown) => {
				if (!disposed) error = caught instanceof Error ? caught.message : 'Failed to load the editor';
			},
		);
		return () => {
			disposed = true;
			for (const lib of libs.values()) lib.dispose();
			libs.clear();
			instance?.dispose();
		};
	});

	$effect(() => {
		if (loaded) applyTheme(loaded, settings.theme, settings.surface);
	});

	$effect(() => {
		if (!loaded) return;
		const { typescriptDefaults } = loaded.typescript;
		const wanted = new Map(packages.map((spec) => [`${spec.name}@${spec.version}`, spec]));
		for (const [key, lib] of libs) {
			if (wanted.has(key)) continue;
			lib.dispose();
			libs.delete(key);
		}
		for (const [key, spec] of wanted) {
			if (libs.has(key)) continue;
			const placeholder = { dispose() {} };
			libs.set(key, placeholder);
			void getTypes(spec).then((types) => {
				if (libs.get(key) !== placeholder || !types) return;
				libs.set(key, typescriptDefaults.addExtraLib(types, `file:///node_modules/${spec.name}/index.d.ts`));
			});
		}
	});
</script>

{#if error}
	<p class="flex-1 p-4 text-danger" role="alert">{error}. Check your connection and reload the page.</p>
{/if}
<div bind:this={root} class="min-h-0 flex-1" class:hidden={error}></div>
