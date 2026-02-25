export const MAX_SHARE_CODE_CHARS = 100_000;
export const MAX_SHARE_PACKAGES = 20;
export const MAX_PACKAGE_NAME_CHARS = 214;
export const MAX_PACKAGE_VERSION_CHARS = 64;

const PACKAGE_NAME_RE = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/i;
const PACKAGE_VERSION_RE = /^(latest|[a-z][a-z0-9._-]*|[~^]?\d+(?:\.\d+){0,2}(?:[-+][0-9a-z.-]+)?)$/i;

export interface ValidatedPackageSpec {
	name: string;
	version: string;
}

export interface ValidatedShareData {
	code: string;
	packages?: ValidatedPackageSpec[];
}

export function normalizePackageName(value: string): string | null {
	const trimmed = value.trim();
	if (!trimmed || trimmed.length > MAX_PACKAGE_NAME_CHARS) return null;
	return PACKAGE_NAME_RE.test(trimmed) ? trimmed : null;
}

export function normalizePackageVersion(value: string): string | null {
	const trimmed = value.trim();
	if (!trimmed || trimmed.length > MAX_PACKAGE_VERSION_CHARS) return null;
	return PACKAGE_VERSION_RE.test(trimmed) ? trimmed : null;
}

export function validatePackageSpec(name: string, version: string): ValidatedPackageSpec | null {
	const safeName = normalizePackageName(name);
	const safeVersion = normalizePackageVersion(version);
	if (!safeName || !safeVersion) return null;
	return { name: safeName, version: safeVersion };
}

export function sanitizeShareData(raw: unknown): ValidatedShareData | null {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

	const source = raw as {
		code?: unknown;
		packages?: unknown;
	};

	if (typeof source.code !== "string") return null;
	if (source.code.length > MAX_SHARE_CODE_CHARS) return null;

	const result: ValidatedShareData = { code: source.code };
	if (!Array.isArray(source.packages)) return result;

	const deduped = new Map<string, string>();
	for (const pkg of source.packages) {
		if (!pkg || typeof pkg !== "object" || Array.isArray(pkg)) continue;
		const value = pkg as { name?: unknown; version?: unknown };
		if (typeof value.name !== "string" || typeof value.version !== "string") continue;

		const validated = validatePackageSpec(value.name, value.version);
		if (!validated) continue;

		deduped.set(validated.name, validated.version);
		if (deduped.size >= MAX_SHARE_PACKAGES) break;
	}

	if (deduped.size > 0) {
		result.packages = [...deduped.entries()].map(([name, version]) => ({ name, version }));
	}

	return result;
}
