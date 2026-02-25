import { writable, get } from "svelte/store";
import { installPackageInContainer, uninstallPackageInContainer } from "$lib/utils/webcontainer";

export interface Package {
  name: string;
  version: string;
  status: "installing" | "installed" | "error";
}

export const packages = writable<Package[]>([]);
let packageOperationQueue: Promise<void> = Promise.resolve();

function enqueuePackageOperation(operation: () => Promise<void>): Promise<void> {
  const queued = packageOperationQueue.then(operation, operation);
  packageOperationQueue = queued.catch(() => {});
  return queued;
}

export function installPackage(name: string, version: string = "latest"): Promise<void> {
  const current = get(packages);
  const existing = current.find((p) => p.name === name);

  if (existing) {
    packages.update((p) =>
      p.map((pkg) => (pkg.name === name ? { ...pkg, version, status: "installing" } : pkg)),
    );
  } else {
    packages.update((p) => [...p, { name, version, status: "installing" }]);
  }

  return enqueuePackageOperation(async () => {
    try {
      const installedVersion = await installPackageInContainer(name, version);
      packages.update((p) =>
        p.map((pkg) =>
          pkg.name === name ? { ...pkg, version: installedVersion, status: "installed" } : pkg,
        ),
      );
    } catch {
      packages.update((p) =>
        p.map((pkg) => (pkg.name === name ? { ...pkg, status: "error" } : pkg)),
      );
    }
  });
}

export function removePackage(name: string): Promise<void> {
  const current = get(packages);
  const existing = current.find((p) => p.name === name);

  if (!existing) return Promise.resolve();

  packages.update((p) =>
    p.map((pkg) => (pkg.name === name ? { ...pkg, status: "installing" } : pkg)),
  );

  return enqueuePackageOperation(async () => {
    try {
      await uninstallPackageInContainer(name);
      packages.update((p) => p.filter((pkg) => pkg.name !== name));
    } catch {
      packages.update((p) =>
        p.map((pkg) => (pkg.name === name ? { ...pkg, status: "error" } : pkg)),
      );
    }
  });
}
