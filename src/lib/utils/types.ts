import { fetchWithTimeout } from "./fetch";
import { normalizePackageName, normalizePackageVersion } from "./validation";
import { TtlLruCache } from "./cache";

const JSDELIVR_BASE = "https://cdn.jsdelivr.net/npm";

interface PackageJson {
	types?: string;
	typings?: string;
	main?: string;
}

const typeCache = new TtlLruCache<string | null>(15 * 60 * 1000, 200);
const inFlightTypeFetches = new Map<string, Promise<string | null>>();

export async function fetchPackageTypes(name: string, version: string): Promise<string | null> {
	const pkgName = normalizePackageName(name);
	const pkgVersion = normalizePackageVersion(version);
	if (!pkgName || !pkgVersion) return null;

	const cacheKey = `${pkgName}@${pkgVersion}`;
	const cached = typeCache.get(cacheKey);
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
			typeCache.set(cacheKey, bundledTypes);
			return bundledTypes;
		}

		const dtTypes = await tryFetchDefinitelyTyped(pkgName);
		typeCache.set(cacheKey, dtTypes);
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

		if (!typesPath || typeof typesPath !== "string" || typesPath.includes("..")) return null;

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
