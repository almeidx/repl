import { fetchWithTimeout } from "./fetch";
import { normalizePackageName } from "./validation";

export interface NpmPackageVersions {
	versions: string[];
	latest: string;
}

const VERSION_CACHE_TTL_MS = 5 * 60 * 1000;
const versionCache = new Map<string, { expiresAt: number; data: NpmPackageVersions }>();

export async function fetchPackageVersions(packageName: string): Promise<NpmPackageVersions> {
	const normalizedName = normalizePackageName(packageName);
	if (!normalizedName) {
		throw new Error("Invalid package name");
	}

	const cached = versionCache.get(normalizedName);
	if (cached && cached.expiresAt > Date.now()) {
		return cached.data;
	}

	const response = await fetchWithTimeout(`https://registry.npmjs.org/${encodeURIComponent(normalizedName)}`);

	if (!response.ok) {
		throw new Error(`Package "${normalizedName}" not found`);
	}

	const data = await response.json();
	const versions = Object.keys(data.versions || {}).reverse();
	const latest = data["dist-tags"]?.latest || versions[0] || "";

	const result = { versions, latest };
	versionCache.set(normalizedName, {
		expiresAt: Date.now() + VERSION_CACHE_TTL_MS,
		data: result,
	});
	return result;
}
