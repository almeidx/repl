import type * as MonacoEditor from "monaco-editor";
import CssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import HtmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
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
			if (label === "json") return new JsonWorker();
			if (label === "css" || label === "scss" || label === "less") return new CssWorker();
			if (label === "html" || label === "handlebars" || label === "razor") return new HtmlWorker();
			return new EditorWorker();
		},
	};
}

export async function loadMonaco(): Promise<MonacoModule> {
	if (monacoPromise) return monacoPromise;

	monacoPromise = (async () => {
		ensureMonacoEnvironment();
		const monaco = await import("monaco-editor");
		return monaco;
	})().catch((error) => {
		monacoPromise = null;
		throw error;
	});

	return monacoPromise;
}
