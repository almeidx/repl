import type * as Monaco from "monaco-editor/editor";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";
import type * as TypeScriptFeatures from "monaco-editor/languages/features/typescript/register";
import TsWorker from "monaco-editor/languages/features/typescript/ts.worker?worker";
import { surfaces, type Theme } from "./settings.svelte.js";

export interface LoadedMonaco {
	monaco: typeof Monaco;
	/** `null` when the TypeScript language service fails to load; highlighting still works. */
	typescript: typeof TypeScriptFeatures | null;
}

export const monacoTheme = (theme: Theme) => `repl-${theme}`;

let loading: Promise<LoadedMonaco> | null = null;

/** Monaco is bundled from npm (no CDN loader) and its workers are same-origin, as the CSP requires. */
export function loadMonaco(): Promise<LoadedMonaco> {
	loading ??= load().catch((error: unknown) => {
		loading = null;
		throw error;
	});
	return loading;
}

async function load(): Promise<LoadedMonaco> {
	// Dynamic imports keep Monaco (several MB) out of the initial bundle; the page renders before it arrives.
	self.MonacoEnvironment = {
		getWorker: (_id, label) => (label === "typescript" || label === "javascript" ? new TsWorker() : new EditorWorker()),
	};
	await import("monaco-editor/features/register.all");
	const monaco = await import("monaco-editor/editor");
	await import("monaco-editor/languages/definitions/typescript/register");
	const typescript = await import("monaco-editor/languages/features/typescript/register").catch(() => null);

	for (const theme of ["light", "dark"] as const) {
		const { background, selection } = surfaces[theme];
		monaco.editor.defineTheme(monacoTheme(theme), {
			base: theme === "dark" ? "vs-dark" : "vs",
			inherit: true,
			rules: [],
			colors: { "editor.background": background, "editor.selectionBackground": selection },
		});
	}

	if (typescript) {
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
	}

	return { monaco, typescript };
}
