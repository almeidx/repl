import type { Package } from "$lib/stores/packages";
import { sanitizeShareData, validatePackageSpec, type ValidatedShareData } from "./validation";

export type ShareData = ValidatedShareData;

function encodeBase64(input: string): string {
	const bytes = new TextEncoder().encode(input);
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

function decodeBase64(input: string): string {
	const binary = atob(input);
	const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
	return new TextDecoder().decode(bytes);
}

export function encodeShareData(code: string, packages: Package[]): string {
	const data: ShareData = { code };

	const installedPackages = packages
		.filter((pkg) => pkg.status === "installed")
		.map((pkg) => validatePackageSpec(pkg.name, pkg.version))
		.filter((pkg): pkg is NonNullable<typeof pkg> => pkg !== null);

	if (installedPackages.length > 0) {
		data.packages = installedPackages;
	}

	return encodeBase64(JSON.stringify(data));
}

export function decodeShareData(encoded: string): ShareData | null {
	if (!encoded) return null;

	try {
		const decoded = decodeBase64(encoded);
		const parsed = JSON.parse(decoded);
		return sanitizeShareData(parsed);
	} catch {
		return null;
	}
}

export function parsePackagesFromSearch(search: string): { name: string; version: string }[] {
	const params = new URLSearchParams(search);
	const pkgParams = params.getAll("pkg");

	return pkgParams
		.map((pkg) => {
			const atIndex = pkg.lastIndexOf("@");
			if (atIndex > 0) {
				return { name: pkg.slice(0, atIndex), version: pkg.slice(atIndex + 1) };
			}
			return { name: pkg, version: "latest" };
		})
		.map((pkg) => validatePackageSpec(pkg.name, pkg.version))
		.filter((pkg): pkg is NonNullable<typeof pkg> => pkg !== null);
}
