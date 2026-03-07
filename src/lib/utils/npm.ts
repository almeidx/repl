import { fetchWithTimeout } from "./fetch";
import { normalizePackageName } from "./validation";
import { TtlLruCache } from "./cache";

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

const versionCache = new TtlLruCache<NpmPackageVersions>(5 * 60 * 1000, 100);

export async function fetchPackageVersions(packageName: string): Promise<NpmPackageVersions> {
	const normalizedName = normalizePackageName(packageName);
	if (!normalizedName) {
		throw new Error("Invalid package name");
	}

	const cached = versionCache.get(normalizedName);
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
	versionCache.set(normalizedName, result);
	return result;
}
