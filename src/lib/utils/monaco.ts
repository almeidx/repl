import type * as MonacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import TsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

type MonacoModule = typeof MonacoEditor;

interface MonacoEnvironmentShape {
	__replConfigured?: boolean;
	getWorker: (_workerId: string, label: string) => Worker;
}

declare global {
	interface Window {
		MonacoEnvironment?: MonacoEnvironmentShape;
	}
}

let monacoPromise: Promise<MonacoModule> | null = null;

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

export async function loadMonaco(): Promise<MonacoModule> {
	if (monacoPromise) return monacoPromise;

	monacoPromise = (async () => {
		ensureMonacoEnvironment();
		const monaco = await import("monaco-editor/esm/vs/editor/editor.api");
		await import("monaco-editor/esm/vs/language/typescript/monaco.contribution");
		return monaco;
	})().catch((error) => {
		monacoPromise = null;
		throw error;
	});

	return monacoPromise;
}
