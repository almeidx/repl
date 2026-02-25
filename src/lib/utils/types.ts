import { fetchWithTimeout } from "./fetch";
import { normalizePackageName, normalizePackageVersion } from "./validation";

const JSDELIVR_BASE = "https://cdn.jsdelivr.net/npm";
const TYPES_CACHE_TTL_MS = 15 * 60 * 1000;

interface PackageJson {
	types?: string;
	typings?: string;
	main?: string;
}

const typeCache = new Map<string, { expiresAt: number; data: string | null }>();
const inFlightTypeFetches = new Map<string, Promise<string | null>>();

export async function fetchPackageTypes(name: string, version: string): Promise<string | null> {
	const pkgName = normalizePackageName(name);
	const pkgVersion = normalizePackageVersion(version);
	if (!pkgName || !pkgVersion) return null;

	const cacheKey = `${pkgName}@${pkgVersion}`;
	const cached = typeCache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) {
		return cached.data;
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
	typeCache.set(cacheKey, {
		expiresAt: Date.now() + TYPES_CACHE_TTL_MS,
		data: value,
	});
}
