import type * as Monaco from "monaco-editor/editor";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";
import type * as TypeScriptFeatures from "monaco-editor/languages/features/typescript/register";
import TsWorker from "monaco-editor/languages/features/typescript/ts.worker?worker";
import type { Surface, Theme } from "./settings.svelte.js";

export interface LoadedMonaco {
	monaco: typeof Monaco;
	typescript: typeof TypeScriptFeatures;
}

let loading: Promise<LoadedMonaco> | undefined;

/** Monaco is bundled from npm (no CDN loader) and its workers are same-origin, as the CSP requires. */
export function loadMonaco(): Promise<LoadedMonaco> {
	loading ??= load();
	return loading;
}

/** Defines (or redefines) the theme's editor colors and applies them. */
export function applyTheme({ monaco }: LoadedMonaco, theme: Theme, { background, selection }: Surface): void {
	const name = `repl-${theme}`;
	monaco.editor.defineTheme(name, {
		base: theme === "dark" ? "vs-dark" : "vs",
		inherit: true,
		rules: [],
		colors: { "editor.background": background, "editor.selectionBackground": selection },
	});
	monaco.editor.setTheme(name);
}

async function load(): Promise<LoadedMonaco> {
	// Dynamic imports keep Monaco (several MB) out of the initial bundle; the page renders before it arrives.
	self.MonacoEnvironment = {
		getWorker: (_id, label) => (label === "typescript" || label === "javascript" ? new TsWorker() : new EditorWorker()),
	};
	await import("monaco-editor/features/register.all");
	const monaco = await import("monaco-editor/editor");
	await import("monaco-editor/languages/definitions/typescript/register");
	const typescript = await import("monaco-editor/languages/features/typescript/register");

	const { typescriptDefaults, ScriptTarget, ModuleKind, ModuleResolutionKind } = typescript;
	typescriptDefaults.setCompilerOptions({
		target: ScriptTarget.ESNext,
		module: ModuleKind.ESNext,
		moduleResolution: ModuleResolutionKind.NodeJs,
		strict: true,
		esModuleInterop: true,
		allowSyntheticDefaultImports: true,
		skipLibCheck: true,
		noEmit: true,
	});
	typescriptDefaults.setEagerModelSync(false);

	return { monaco, typescript };
}
