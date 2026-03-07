import { writable, get } from "svelte/store";
import type { WebContainer } from "@webcontainer/api";

export interface ContainerState {
	status: "idle" | "booting" | "ready" | "running" | "installing" | "error";
	error?: string;
}

export const containerState = writable<ContainerState>({ status: "idle" });

let webcontainer: WebContainer | null = null;
let currentProcess: { runId: number; process: Awaited<ReturnType<WebContainer["spawn"]>> } | null = null;
let executionTimeout: { runId: number; timeout: ReturnType<typeof setTimeout> } | null = null;
let bootPromise: Promise<void> | null = null;
let activeTask: "running" | "packages" | null = null;
let currentRunId = 0;

const EXECUTION_TIMEOUT_MS = 30000;

const FILES = {
	"package.json": {
		file: {
			contents: JSON.stringify(
				{
					name: "repl-sandbox",
					type: "module",
					dependencies: {
						tsx: "^4.21.0",
					},
				},
				null,
				2,
			),
		},
	},
	"tsconfig.json": {
		file: {
			contents: JSON.stringify(
				{
					compilerOptions: {
						target: "ES2022",
						module: "ESNext",
						moduleResolution: "bundler",
						strict: true,
						esModuleInterop: true,
						skipLibCheck: true,
					},
				},
				null,
				2,
			),
		},
	},
};

async function bootContainer(): Promise<void> {
	containerState.set({ status: "booting" });

	try {
		const webcontainerApi = await import("@webcontainer/api");
		const WebContainer = webcontainerApi.WebContainer;

		webcontainer = await WebContainer.boot();
		await webcontainer.mount(FILES);

		const installProcess = await webcontainer.spawn("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"]);
		const exitCode = await installProcess.exit;
		if (exitCode !== 0) {
			throw new Error("Failed to install runtime dependencies");
		}

		containerState.set({ status: "ready" });
	} catch (e) {
		containerState.set({
			status: "error",
			error: "Failed to start. Try running again or refreshing the page.",
		});
		throw e;
	}
}

function resetAfterBootError(): void {
	clearExecutionTimeout();
	currentProcess = null;
	activeTask = null;
	bootPromise = null;
	if (webcontainer) {
		try {
			webcontainer.teardown();
		} catch {
			// Ignore teardown errors while recovering from a failed boot.
		}
		webcontainer = null;
	}
	containerState.set({ status: "idle" });
}

export async function ensureBooted(): Promise<void> {
	const state = get(containerState);
	if (state.status === "ready" || state.status === "running" || state.status === "installing") return;
	if (state.status === "error" && !bootPromise) {
		resetAfterBootError();
	}

	if (!bootPromise) {
		bootPromise = bootContainer().catch((error) => {
			bootPromise = null;
			throw error;
		});
	}
	await bootPromise;
}

function clearExecutionTimeout(runId?: number): void {
	if (executionTimeout) {
		if (runId !== undefined && executionTimeout.runId !== runId) return;
		clearTimeout(executionTimeout.timeout);
		executionTimeout = null;
	}
}

function setReadyState(runId?: number): void {
	if (runId !== undefined && runId !== currentRunId) return;
	if (get(containerState).status !== "error") {
		containerState.set({ status: "ready" });
	}
}

function tryAcquireTask(task: "running" | "packages"): boolean {
	if (activeTask) return false;
	activeTask = task;
	return true;
}

function releaseTask(task: "running" | "packages"): void {
	if (activeTask === task) {
		activeTask = null;
	}
}

function getContainer(): WebContainer {
	if (!webcontainer) throw new Error("WebContainer is not available");
	return webcontainer;
}

export async function runCode(code: string, onOutput: (data: string) => void): Promise<void> {
	try {
		await ensureBooted();
	} catch (e) {
		onOutput(`\n\x1b[31mError: ${e instanceof Error ? e.message : "Failed to start runtime"}\x1b[0m\n`);
		return;
	}

	if (!tryAcquireTask("running")) {
		onOutput("\n\x1b[33mContainer is busy. Please wait for the current task to finish.\x1b[0m\n");
		return;
	}

	const status = get(containerState).status;
	if (status !== "ready") {
		releaseTask("running");
		if (status === "installing") {
			onOutput("\n\x1b[33mPackage installation is in progress. Run again when it finishes.\x1b[0m\n");
		} else {
			onOutput("\n\x1b[33mContainer is busy. Please wait for the current task to finish.\x1b[0m\n");
		}
		return;
	}

	const runId = ++currentRunId;
	containerState.set({ status: "running" });

	try {
		await getContainer().fs.writeFile("index.ts", code);

		const process = await getContainer().spawn("./node_modules/.bin/tsx", ["index.ts"]);
		currentProcess = { runId, process };
		let timedOut = false;

		const outputPipe = process.output
			.pipeTo(
				new WritableStream({
					write(data) {
						onOutput(data);
					},
				}),
			)
			.catch(() => {
				// Stream may close abruptly when process is terminated; safe to ignore.
			});

		executionTimeout = {
			runId,
			timeout: setTimeout(() => {
				timedOut = true;
				onOutput("\n\x1b[33mExecution timed out after 30 seconds\x1b[0m\n");
				stopExecution();
			}, EXECUTION_TIMEOUT_MS),
		};

		const exitCode = await process.exit;
		await outputPipe;

		if (exitCode !== 0 && !timedOut) {
			onOutput(`\n\x1b[31mProcess exited with code ${exitCode}\x1b[0m\n`);
		}
	} catch (e) {
		onOutput(`\n\x1b[31mError: ${e instanceof Error ? e.message : "Unknown error"}\x1b[0m\n`);
	} finally {
		clearExecutionTimeout(runId);
		if (currentProcess?.runId === runId) {
			currentProcess = null;
		}
		releaseTask("running");
		if (get(containerState).status === "running") {
			setReadyState(runId);
		}
	}
}

export function stopExecution(): void {
	clearExecutionTimeout();
	if (currentProcess) {
		currentProcess.process.kill();
		currentProcess = null;
	}
	releaseTask("running");
	if (get(containerState).status === "running") {
		containerState.set({ status: "ready" });
	}
}

export interface InstallInContainerOptions {
	allowScripts: boolean;
}

export async function installPackageInContainer(
	name: string,
	version: string,
	options: InstallInContainerOptions,
): Promise<string> {
	await ensureBooted();

	if (!tryAcquireTask("packages")) throw new Error("Container busy");

	if (get(containerState).status !== "ready") {
		releaseTask("packages");
		throw new Error("Container busy");
	}

	containerState.set({ status: "installing" });

	try {
		const pkgSpec = version === "latest" ? name : `${name}@${version}`;
		const installArgs = ["install", "--save-exact", "--no-audit", "--no-fund"];
		if (!options.allowScripts) {
			installArgs.push("--ignore-scripts");
		}
		installArgs.push(pkgSpec);

		const installProcess = await getContainer().spawn("npm", installArgs);

		const exitCode = await installProcess.exit;
		if (exitCode !== 0) {
			throw new Error(`Failed to install ${pkgSpec}`);
		}

		const pkgJsonContent = await getContainer().fs.readFile("package.json", "utf-8");
		let installedVersion: string | undefined;
		try {
			const pkgJson = JSON.parse(pkgJsonContent) as { dependencies?: Record<string, string> };
			installedVersion = pkgJson.dependencies?.[name];
		} catch {
			// package.json may be malformed after install; fall back to requested version
		}

		if (installedVersion) {
			return installedVersion.replace(/^[\^~]/, "");
		}
		return version === "latest" ? "latest" : version;
	} finally {
		releaseTask("packages");
		setReadyState();
	}
}

export async function uninstallPackageInContainer(name: string): Promise<void> {
	await ensureBooted();

	if (!tryAcquireTask("packages")) throw new Error("Container busy");

	if (get(containerState).status !== "ready") {
		releaseTask("packages");
		throw new Error("Container busy");
	}

	containerState.set({ status: "installing" });

	try {
		const uninstallProcess = await getContainer().spawn("npm", [
			"uninstall",
			"--ignore-scripts",
			"--no-audit",
			"--no-fund",
			name,
		]);
		const exitCode = await uninstallProcess.exit;
		if (exitCode !== 0) {
			throw new Error(`Failed to remove ${name}`);
		}
	} finally {
		releaseTask("packages");
		setReadyState();
	}
}
