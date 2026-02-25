import { replaceState } from "$app/navigation";
import type { Package } from "$lib/stores/packages";
import { decodeShareData, encodeShareData, parsePackagesFromSearch, type ShareData } from "./share-data";

export function encodeShareUrl(code: string, packages: Package[]): string {
	const encoded = encodeShareData(code, packages);
	return `${window.location.origin}${window.location.pathname}#${encoded}`;
}

export function updateUrlHash(code: string, packages: Package[]): void {
	const encoded = encodeShareData(code, packages);
	if (window.location.hash.slice(1) === encoded) return;
	const nextUrl = `${window.location.pathname}${window.location.search}#${encoded}`;
	replaceState(nextUrl, {});
}

export function decodeShareUrl(): ShareData | null {
	const hash = window.location.hash.slice(1);
	return decodeShareData(hash);
}

export function parsePackagesFromUrl(): { name: string; version: string }[] {
	return parsePackagesFromSearch(window.location.search);
}
