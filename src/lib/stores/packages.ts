import { writable, get } from "svelte/store";
import { installPackageInContainer, uninstallPackageInContainer } from "$lib/utils/webcontainer";
import { validatePackageSpec } from "$lib/utils/validation";

export interface Package {
	name: string;
	version: string;
	status: "installing" | "installed" | "error";
	errorMessage?: string;
}

export interface InstallPackageOptions {
	allowScripts: boolean;
	source: "manual" | "share";
}

export const packages = writable<Package[]>([]);
let packageOperationQueue: Promise<void> = Promise.resolve();

function enqueuePackageOperation(operation: () => Promise<void>): Promise<void> {
	const queued = packageOperationQueue.then(operation, operation);
	packageOperationQueue = queued.catch(() => {});
	return queued;
}

export function installPackage(
	name: string,
	version: string = "latest",
	options: InstallPackageOptions = { allowScripts: false, source: "manual" },
): Promise<void> {
	const validated = validatePackageSpec(name, version);
	if (!validated) {
		return Promise.reject(new Error("Invalid package name or version"));
	}

	name = validated.name;
	version = validated.version;

	const current = get(packages);
	const existing = current.find((p) => p.name === name);

	if (existing) {
		packages.update((p) =>
			p.map((pkg) => (pkg.name === name ? { ...pkg, version, status: "installing", errorMessage: undefined } : pkg)),
		);
	} else {
		packages.update((p) => [...p, { name, version, status: "installing", errorMessage: undefined }]);
	}

	return enqueuePackageOperation(async () => {
		try {
			const installedVersion = await installPackageInContainer(name, version, {
				allowScripts: options.allowScripts,
			});
			packages.update((p) =>
				p.map((pkg) =>
					pkg.name === name ? { ...pkg, version: installedVersion, status: "installed", errorMessage: undefined } : pkg,
				),
			);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Failed to install package";
			packages.update((p) => p.map((pkg) => (pkg.name === name ? { ...pkg, status: "error", errorMessage } : pkg)));
		}
	});
}

export function removePackage(name: string): Promise<void> {
	const current = get(packages);
	const existing = current.find((p) => p.name === name);

	if (!existing) return Promise.resolve();

	packages.update((p) =>
		p.map((pkg) => (pkg.name === name ? { ...pkg, status: "installing", errorMessage: undefined } : pkg)),
	);

	return enqueuePackageOperation(async () => {
		try {
			await uninstallPackageInContainer(name);
			packages.update((p) => p.filter((pkg) => pkg.name !== name));
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Failed to remove package";
			packages.update((p) => p.map((pkg) => (pkg.name === name ? { ...pkg, status: "error", errorMessage } : pkg)));
		}
	});
}
