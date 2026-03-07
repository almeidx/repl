import { replaceState } from "$app/navigation";
import type { Package } from "$lib/stores/packages";
import { decodeShareData, encodeShareData, parsePackagesFromSearch } from "./share-data";
import type { ValidatedShareData } from "./validation";

export function encodeShareUrl(code: string, packages: Package[]): string {
	const encoded = encodeShareData(code, packages);
	return `${window.location.origin}${window.location.pathname}#${encoded}`;
}

export function updateUrlHash(code: string, packages: Package[]): void {
	let encoded: string;
	try {
		encoded = encodeShareData(code, packages);
	} catch {
		return;
	}
	if (window.location.hash.slice(1) === encoded) return;
	const nextUrl = `${window.location.pathname}${window.location.search}#${encoded}`;
	replaceState(nextUrl, {});
}

export function decodeShareUrl(): ValidatedShareData | null {
	const hash = window.location.hash.slice(1);
	return decodeShareData(hash);
}

export function parsePackagesFromUrl(): { name: string; version: string }[] {
	return parsePackagesFromSearch(window.location.search);
}
