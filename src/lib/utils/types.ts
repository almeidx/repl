import { fetchWithTimeout } from "./fetch";
import { normalizePackageName, normalizePackageVersion } from "./validation";

const JSDELIVR_BASE = "https://cdn.jsdelivr.net/npm";
const TYPES_CACHE_TTL_MS = 15 * 60 * 1000;
const TYPES_CACHE_MAX_ENTRIES = 200;

interface PackageJson {
	types?: string;
	typings?: string;
	main?: string;
}

const typeCache = new Map<string, { expiresAt: number; data: string | null }>();
const inFlightTypeFetches = new Map<string, Promise<string | null>>();

function readCachedTypeResult(cacheKey: string, now: number): string | null | undefined {
	const cached = typeCache.get(cacheKey);
	if (!cached) return undefined;
	if (cached.expiresAt <= now) {
		typeCache.delete(cacheKey);
		return undefined;
	}
	typeCache.delete(cacheKey);
	typeCache.set(cacheKey, cached);
	return cached.data;
}

function pruneTypeCache(now: number): void {
	for (const [cacheKey, entry] of typeCache.entries()) {
		if (entry.expiresAt <= now) {
			typeCache.delete(cacheKey);
		}
	}

	while (typeCache.size > TYPES_CACHE_MAX_ENTRIES) {
		const oldestCacheKey = typeCache.keys().next().value as string | undefined;
		if (!oldestCacheKey) break;
		typeCache.delete(oldestCacheKey);
	}
}

export async function fetchPackageTypes(name: string, version: string): Promise<string | null> {
	const pkgName = normalizePackageName(name);
	const pkgVersion = normalizePackageVersion(version);
	if (!pkgName || !pkgVersion) return null;

	const cacheKey = `${pkgName}@${pkgVersion}`;
	const cached = readCachedTypeResult(cacheKey, Date.now());
	if (cached !== undefined) {
		return cached;
	}

	const existingRequest = inFlightTypeFetches.get(cacheKey);
	if (existingRequest) {
		return existingRequest;
	}

	const request = (async () => {
		const bundledTypes = await tryFetchBundledTypes(pkgName, pkgVersion);
		if (bundledTypes) {
			cacheTypeResult(cacheKey, bundledTypes);
			return bundledTypes;
		}

		const dtTypes = await tryFetchDefinitelyTyped(pkgName);
		cacheTypeResult(cacheKey, dtTypes);
		return dtTypes;
	})();

	inFlightTypeFetches.set(cacheKey, request);

	try {
		return await request;
	} finally {
		inFlightTypeFetches.delete(cacheKey);
	}
}

async function tryFetchBundledTypes(name: string, version: string): Promise<string | null> {
	try {
		const pkgJsonUrl = `${JSDELIVR_BASE}/${name}@${version}/package.json`;
		const res = await fetchWithTimeout(pkgJsonUrl);
		if (!res.ok) return null;

		const pkgJson: PackageJson = await res.json();
		const typesPath = pkgJson.types || pkgJson.typings;

		if (!typesPath) return null;

		const typesUrl = `${JSDELIVR_BASE}/${name}@${version}/${typesPath}`;
		const typesRes = await fetchWithTimeout(typesUrl);
		if (!typesRes.ok) return null;

		return await typesRes.text();
	} catch {
		return null;
	}
}

async function tryFetchDefinitelyTyped(name: string): Promise<string | null> {
	try {
		const dtName = name.startsWith("@") ? `@types/${name.slice(1).replace("/", "__")}` : `@types/${name}`;

		const indexUrl = `${JSDELIVR_BASE}/${dtName}/index.d.ts`;
		const res = await fetchWithTimeout(indexUrl);
		if (!res.ok) return null;

		return await res.text();
	} catch {
		return null;
	}
}

function cacheTypeResult(cacheKey: string, value: string | null): void {
	const now = Date.now();
	pruneTypeCache(now);
	typeCache.set(cacheKey, {
		expiresAt: now + TYPES_CACHE_TTL_MS,
		data: value,
	});
	pruneTypeCache(now);
}
