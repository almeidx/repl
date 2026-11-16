import type { WebContainer, WebContainerProcess } from "@webcontainer/api";
import type { PackageSpec } from "./npm.js";

export type RuntimeStatus = "idle" | "booting" | "ready" | "running" | "installing" | "error";

export interface InstalledPackage extends PackageSpec {
	status: "installing" | "installed" | "error";
	error?: string;
}

const RUN_TIMEOUT_MS = 30_000;
const NPM_FLAGS = ["--no-audit", "--no-fund"];

const FILES = {
	"package.json": {
		file: { contents: JSON.stringify({ name: "repl-sandbox", type: "module", dependencies: { tsx: "^4.21.0" } }) },
	},
	"tsconfig.json": {
		file: {
			contents: JSON.stringify({
				compilerOptions: {
					target: "ES2022",
					module: "ESNext",
					moduleResolution: "bundler",
					strict: true,
					esModuleInterop: true,
					skipLibCheck: true,
				},
			}),
		},
	},
};

export const red = (text: string) => `\n\x1b[31m${text}\x1b[0m\n`;
export const yellow = (text: string) => `\n\x1b[33m${text}\x1b[0m\n`;

function message(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
 * The single in-browser Node.js sandbox. Booting is lazy (first run or install),
 * and runs and npm commands take turns: one task touches the container at a time.
 */
class Runtime {
	status = $state<RuntimeStatus>("idle");
	packages = $state<InstalledPackage[]>([]);

	#container: Promise<WebContainer> | null = null;
	#tail: Promise<unknown> = Promise.resolve();
	#process: WebContainerProcess | null = null;
	/** Bumped by every run and stop, so a stale run never touches newer state. */
	#run = 0;

	get busy(): boolean {
		return this.status === "booting" || this.status === "running" || this.status === "installing";
	}

	/** Runs `code` with tsx, streaming output; stops after 30 seconds. */
	run(code: string, write: (data: string) => void): Promise<void> {
		if (this.busy) {
			write(yellow(this.status === "installing" ? "Wait for the package install to finish." : "Already running."));
			return Promise.resolve();
		}
		return this.#exclusive(async () => {
			let container: WebContainer;
			try {
				container = await this.#boot();
			} catch (error) {
				write(red(`Failed to start: ${message(error)}. Run again to retry.`));
				return;
			}

			const id = ++this.#run;
			this.status = "running";
			const timer = setTimeout(() => {
				write(yellow(`Execution timed out after ${RUN_TIMEOUT_MS / 1000} seconds`));
				this.stop();
			}, RUN_TIMEOUT_MS);
			try {
				await container.fs.writeFile("index.ts", code);
				const process = await container.spawn("./node_modules/.bin/tsx", ["index.ts"]);
				if (id !== this.#run) {
					process.kill();
					return;
				}
				this.#process = process;
				// The stream errors when the process is killed; the exit code below still settles.
				const output = process.output.pipeTo(new WritableStream({ write })).catch(() => {});
				const exitCode = await process.exit;
				await output;
				if (exitCode !== 0 && id === this.#run) write(red(`Process exited with code ${exitCode}`));
			} catch (error) {
				if (id === this.#run) write(red(`Error: ${message(error)}`));
			} finally {
				clearTimeout(timer);
				if (id === this.#run) {
					this.#process = null;
					this.status = "ready";
				}
			}
		});
	}

	/** Kills the running process, if any. */
	stop(): void {
		if (this.status !== "running") return;
		this.#run++;
		this.#process?.kill();
		this.#process = null;
		this.status = "ready";
	}

	install(spec: PackageSpec, { allowScripts }: { allowScripts: boolean }): Promise<void> {
		this.#setPackage({ ...spec, status: "installing" });
		const target = spec.version === "latest" ? spec.name : `${spec.name}@${spec.version}`;
		const args = ["install", "--save-exact", ...NPM_FLAGS, ...(allowScripts ? [] : ["--ignore-scripts"]), target];
		return this.#npm(spec.name, args, async (container) => {
			const manifest = JSON.parse(await container.fs.readFile("package.json", "utf-8")) as {
				dependencies?: Record<string, string>;
			};
			this.#setPackage({ ...spec, version: manifest.dependencies?.[spec.name] ?? spec.version, status: "installed" });
		});
	}

	uninstall(name: string): Promise<void> {
		const existing = this.packages.find((entry) => entry.name === name);
		if (!existing) return Promise.resolve();
		this.#setPackage({ ...existing, status: "installing", error: undefined });
		return this.#npm(name, ["uninstall", "--ignore-scripts", ...NPM_FLAGS, name], async () => {
			this.packages = this.packages.filter((entry) => entry.name !== name);
		});
	}

	async #npm(name: string, args: string[], onSuccess: (container: WebContainer) => Promise<void>): Promise<void> {
		return this.#exclusive(async () => {
			try {
				const container = await this.#boot();
				this.status = "installing";
				const process = await container.spawn("npm", args);
				if ((await process.exit) !== 0) throw new Error(`npm ${args[0]} failed`);
				await onSuccess(container);
			} catch (error) {
				const existing = this.packages.find((entry) => entry.name === name);
				if (existing) this.#setPackage({ ...existing, status: "error", error: message(error) });
			} finally {
				if (this.status === "installing") this.status = "ready";
			}
		});
	}

	#setPackage(entry: InstalledPackage): void {
		const index = this.packages.findIndex((existing) => existing.name === entry.name);
		if (index === -1) this.packages.push(entry);
		else this.packages[index] = entry;
	}

	#exclusive<T>(task: () => Promise<T>): Promise<T> {
		const result = this.#tail.then(task);
		this.#tail = result.catch(() => {});
		return result;
	}

	#boot(): Promise<WebContainer> {
		this.#container ??= this.#start().catch((error: unknown) => {
			this.#container = null;
			this.status = "error";
			throw error;
		});
		return this.#container;
	}

	async #start(): Promise<WebContainer> {
		this.status = "booting";
		// Loaded on first use: the API is only needed once the user runs or installs something.
		const { WebContainer } = await import("@webcontainer/api");
		const container = await WebContainer.boot();
		try {
			await container.mount(FILES);
			const install = await container.spawn("npm", ["install", "--ignore-scripts", ...NPM_FLAGS]);
			if ((await install.exit) !== 0) throw new Error("could not install the TypeScript runner");
		} catch (error) {
			container.teardown();
			throw error;
		}
		this.status = "ready";
		return container;
	}
}

export const runtime = new Runtime();
