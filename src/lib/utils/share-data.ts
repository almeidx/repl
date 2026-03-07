import type { Package } from "$lib/stores/packages";
import { MAX_SHARE_CODE_CHARS, sanitizeShareData, validatePackageSpec, type ValidatedShareData } from "./validation";

function encodeBase64(input: string): string {
	const bytes = new TextEncoder().encode(input);
	const chunks: string[] = [];
	for (let i = 0; i < bytes.length; i += 8192) {
		chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
	}
	return btoa(chunks.join(""));
}

function decodeBase64(input: string): string {
	const binary = atob(input);
	const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
	return new TextDecoder().decode(bytes);
}

export function encodeShareData(code: string, packages: Package[]): string {
	if (code.length > MAX_SHARE_CODE_CHARS) {
		throw new RangeError(`Code exceeds maximum share size of ${MAX_SHARE_CODE_CHARS} characters`);
	}

	const data: ValidatedShareData = { code };

	const installedPackages = packages
		.filter((pkg) => pkg.status === "installed")
		.map((pkg) => validatePackageSpec(pkg.name, pkg.version))
		.filter((pkg): pkg is NonNullable<typeof pkg> => pkg !== null);

	if (installedPackages.length > 0) {
		data.packages = installedPackages;
	}

	return encodeBase64(JSON.stringify(data));
}

export function decodeShareData(encoded: string): ValidatedShareData | null {
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
