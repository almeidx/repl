import { parseSpec, type PackageSpec } from "./npm.js";

/**
 * Shared links carry the code and installed packages in the URL hash, so they
 * never reach a server: `#` + base64(UTF-8 JSON `{ code, packages? }`).
 * Links already in circulation depend on this format; keep it readable.
 */
export const MAX_SHARED_CODE = 100_000;
export const MAX_SHARED_PACKAGES = 20;

export interface Shared {
	/** `null` when the link carries no (valid) code, e.g. a legacy `?pkg=` link. */
	code: string | null;
	packages: PackageSpec[];
}

/** Throws a `RangeError` when the code is too large to share. */
export function encodeShare(code: string, packages: readonly PackageSpec[]): string {
	if (code.length > MAX_SHARED_CODE) throw new RangeError("Code is too large to share");
	const payload: { code: string; packages?: PackageSpec[] } = { code };
	if (packages.length > 0) payload.packages = packages.map(({ name, version }) => ({ name, version }));

	const bytes = new TextEncoder().encode(JSON.stringify(payload));
	let binary = "";
	for (let i = 0; i < bytes.length; i += 0x2000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x2000));
	return btoa(binary);
}

/** Reads a shared link. Untrusted input: anything malformed is dropped rather than thrown. */
export function decodeShare({ hash, search }: { hash: string; search: string }): Shared {
	const packages = new Map<string, string>();
	const add = (name: unknown, version: unknown, replace: boolean) => {
		if (typeof name !== "string" || typeof version !== "string") return;
		const spec = parseSpec(name, version);
		if (!spec || (packages.has(spec.name) ? !replace : packages.size >= MAX_SHARED_PACKAGES)) return;
		packages.set(spec.name, spec.version);
	};

	const payload = parseHash(hash.replace(/^#/, ""));
	const code = typeof payload?.code === "string" && payload.code.length <= MAX_SHARED_CODE ? payload.code : null;
	if (code !== null && Array.isArray(payload?.packages)) {
		for (const entry of payload.packages) add(entry?.name, entry?.version, true);
	}

	// Legacy `?pkg=name@version` links; the hash wins.
	for (const value of new URLSearchParams(search).getAll("pkg")) {
		const at = value.lastIndexOf("@");
		add(at > 0 ? value.slice(0, at) : value, at > 0 ? value.slice(at + 1) : "latest", false);
	}

	return { code, packages: [...packages].map(([name, version]) => ({ name, version })) };
}

function parseHash(
	hash: string,
): { code?: unknown; packages?: Array<{ name?: unknown; version?: unknown } | null> } | null {
	if (!hash) return null;
	try {
		const bytes = Uint8Array.from(atob(hash), (char) => char.charCodeAt(0));
		const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
		return value && typeof value === "object" && !Array.isArray(value) ? value : null;
	} catch {
		return null;
	}
}
