import { fetchWithTimeout } from "./fetch";
import { normalizePackageName } from "./validation";

export interface NpmPackageVersions {
	versions: string[];
	latest: string;
}

interface NpmVersionMetadataResponse {
	versions?: Record<string, unknown>;
	"dist-tags"?: {
		latest?: string;
	};
}

const VERSION_CACHE_TTL_MS = 5 * 60 * 1000;
const VERSION_CACHE_MAX_ENTRIES = 100;
const versionCache = new Map<string, { expiresAt: number; data: NpmPackageVersions }>();

function readCachedVersions(packageName: string, now: number): NpmPackageVersions | null {
	const cached = versionCache.get(packageName);
	if (!cached) return null;
	if (cached.expiresAt <= now) {
		versionCache.delete(packageName);
		return null;
	}
	versionCache.delete(packageName);
	versionCache.set(packageName, cached);
	return cached.data;
}

function pruneVersionCache(now: number): void {
	for (const [cacheKey, entry] of versionCache.entries()) {
		if (entry.expiresAt <= now) {
			versionCache.delete(cacheKey);
		}
	}

	while (versionCache.size > VERSION_CACHE_MAX_ENTRIES) {
		const oldestCacheKey = versionCache.keys().next().value as string | undefined;
		if (!oldestCacheKey) break;
		versionCache.delete(oldestCacheKey);
	}
}

function cacheVersionResult(packageName: string, data: NpmPackageVersions): void {
	const now = Date.now();
	pruneVersionCache(now);
	versionCache.set(packageName, {
		expiresAt: now + VERSION_CACHE_TTL_MS,
		data,
	});
	pruneVersionCache(now);
}

export async function fetchPackageVersions(packageName: string): Promise<NpmPackageVersions> {
	const normalizedName = normalizePackageName(packageName);
	if (!normalizedName) {
		throw new Error("Invalid package name");
	}

	const cached = readCachedVersions(normalizedName, Date.now());
	if (cached) {
		return cached;
	}

	const response = await fetchWithTimeout(`https://registry.npmjs.org/${encodeURIComponent(normalizedName)}`, {
		headers: {
			Accept: "application/vnd.npm.install-v1+json",
		},
	});

	if (!response.ok) {
		throw new Error(`Package "${normalizedName}" not found`);
	}

	const data = (await response.json()) as NpmVersionMetadataResponse;
	const versions = Object.keys(data.versions || {}).reverse();
	const latest = data["dist-tags"]?.latest || versions[0] || "";

	const result = { versions, latest };
	cacheVersionResult(normalizedName, result);
	return result;
}
