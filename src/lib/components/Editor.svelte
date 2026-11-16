<script lang="ts">
	import type { editor, IDisposable } from 'monaco-editor/editor';
	import { loadMonaco, monacoTheme, type LoadedMonaco } from '#lib/monaco.js';
	import { getTypes } from '#lib/npm.js';
	import { runtime } from '#lib/runtime.svelte.js';
	import { settings } from '#lib/settings.svelte.js';
	import { onMount, untrack } from 'svelte';

	let { value = $bindable() }: { value: string } = $props();

	let root: HTMLDivElement;
	let loaded = $state.raw<LoadedMonaco | null>(null);
	let instance = $state.raw<editor.IStandaloneCodeEditor | null>(null);
	let error = $state<string | null>(null);
	/** Declarations of installed packages, keyed by `name@version`; a no-op placeholder while loading. */
	const libs = new Map<string, IDisposable>();

	onMount(() => {
		let disposed = false;
		loadMonaco().then(
			(result) => {
				if (disposed) return;
				loaded = result;
				const created = result.monaco.editor.create(root, {
					value: untrack(() => value),
					language: result.typescript ? 'typescript' : 'javascript',
					theme: monacoTheme(untrack(() => settings.theme)),
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
			instance = null;
		};
	});

	// Shared links and other outside changes.
	$effect(() => {
		if (instance && instance.getValue() !== value) instance.setValue(value);
	});

	$effect(() => {
		loaded?.monaco.editor.setTheme(monacoTheme(settings.theme));
	});

	$effect(() => {
		const typescript = loaded?.typescript;
		if (!typescript) return;
		const installed = new Map(
			runtime.packages.filter((entry) => entry.status === 'installed').map((entry) => [`${entry.name}@${entry.version}`, entry]),
		);
		for (const [key, lib] of libs) {
			if (installed.has(key)) continue;
			lib.dispose();
			libs.delete(key);
		}
		for (const [key, spec] of installed) {
			if (libs.has(key)) continue;
			const placeholder = { dispose() {} };
			libs.set(key, placeholder);
			void getTypes(spec).then((types) => {
				if (libs.get(key) !== placeholder || !types) return;
				libs.set(key, typescript.typescriptDefaults.addExtraLib(types, `file:///node_modules/${spec.name}/index.d.ts`));
			});
		}
	});
</script>

{#if error}
	<p class="flex-1 p-4 text-danger" role="alert">{error}. Check your connection and reload the page.</p>
{/if}
<div bind:this={root} class="min-h-0 flex-1" class:hidden={error}></div>
