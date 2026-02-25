import type { Package } from "$lib/stores/packages";

export interface ShareData {
  code: string;
  packages?: { name: string; version: string }[];
}

export function encodeShareData(code: string, packages: Package[]): string {
  const data: ShareData = { code };

  const installedPackages = packages
    .filter((pkg) => pkg.status === "installed")
    .map((pkg) => ({ name: pkg.name, version: pkg.version }));

  if (installedPackages.length > 0) {
    data.packages = installedPackages;
  }

  return btoa(encodeURIComponent(JSON.stringify(data)));
}

export function decodeShareData(encoded: string): ShareData | null {
  if (!encoded) return null;

  try {
    return JSON.parse(decodeURIComponent(atob(encoded)));
  } catch {
    return null;
  }
}

export function parsePackagesFromSearch(search: string): { name: string; version: string }[] {
  const params = new URLSearchParams(search);
  const pkgParams = params.getAll("pkg");

  return pkgParams.map((pkg) => {
    const atIndex = pkg.lastIndexOf("@");
    if (atIndex > 0) {
      return { name: pkg.slice(0, atIndex), version: pkg.slice(atIndex + 1) };
    }
    return { name: pkg, version: "latest" };
  });
}
