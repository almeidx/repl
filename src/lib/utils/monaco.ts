import type * as MonacoEditor from "monaco-editor/editor";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";
import TsWorker from "monaco-editor/languages/features/typescript/ts.worker?worker";

type MonacoModule = typeof MonacoEditor;

export interface MonacoLoadResult {
	monaco: MonacoModule;
	typescript: typeof import("monaco-editor/languages/features/typescript/register") | null;
}

interface MonacoEnvironmentShape {
	__replConfigured?: boolean;
	getWorker: (_workerId: string, label: string) => Worker;
}

declare global {
	interface Window {
		MonacoEnvironment?: MonacoEnvironmentShape;
	}
}

let monacoPromise: Promise<MonacoLoadResult> | null = null;

function ensureMonacoEnvironment(): void {
	if (window.MonacoEnvironment?.__replConfigured) return;

	window.MonacoEnvironment = {
		__replConfigured: true,
		getWorker(_workerId: string, label: string): Worker {
			if (label === "typescript" || label === "javascript") return new TsWorker();
			return new EditorWorker();
		},
	};
}

export async function loadMonaco(): Promise<MonacoLoadResult> {
	if (monacoPromise) return monacoPromise;

	monacoPromise = (async () => {
		ensureMonacoEnvironment();
		await import("monaco-editor/features/register.all");
		const monaco = await import("monaco-editor/editor");
		await import("monaco-editor/languages/definitions/typescript/register");
		let typescript: MonacoLoadResult["typescript"] = null;
		try {
			typescript = await import("monaco-editor/languages/features/typescript/register");
		} catch {
			// TS language service failed to load; syntax highlighting still works via basic-languages
		}
		return { monaco, typescript };
	})().catch((error) => {
		monacoPromise = null;
		throw error;
	});

	return monacoPromise;
}
