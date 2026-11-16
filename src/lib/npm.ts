const REGISTRY = "https://registry.npmjs.org";
const CDN = "https://cdn.jsdelivr.net/npm";
const TIMEOUT_MS = 10_000;

const NAME_RE = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/i;
/** `latest`, a dist-tag, or a plain/caret/tilde version. Never a URL, path, alias or shell syntax. */
const VERSION_RE = /^(latest|[a-z][a-z0-9._-]*|[~^]?\d+(?:\.\d+){0,2}(?:[-+][0-9a-z.-]+)?)$/i;

export interface PackageSpec {
	name: string;
	version: string;
}

/**
 * Validates a package name and version before they reach `npm install` or a URL.
 * Every spec from user input or a shared link must pass through here.
 */
export function parseSpec(name: string, version = "latest"): PackageSpec | null {
	name = name.trim();
	version = version.trim() || "latest";
	if (name.length > 214 || !NAME_RE.test(name)) return null;
	if (version.length > 64 || !VERSION_RE.test(version)) return null;
	return { name, version };
}

function get(url: string, init?: RequestInit): Promise<Response> {
	return fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
}

/** Memoizes a request for the page's lifetime; failures are forgotten so they can be retried. */
function memoize<T>(load: (key: string) => Promise<T>): (key: string) => Promise<T> {
	const cache = new Map<string, Promise<T>>();
	return (key) => {
		let promise = cache.get(key);
		if (!promise) {
			promise = load(key);
			cache.set(key, promise);
			promise.catch(() => cache.delete(key));
		}
		return promise;
	};
}

/** Published versions, newest first. */
export const getVersions = memoize(async (name: string): Promise<string[]> => {
	const response = await get(`${REGISTRY}/${encodeURIComponent(name)}`, {
		headers: { Accept: "application/vnd.npm.install-v1+json" },
	});
	if (!response.ok) throw new Error(response.status === 404 ? `"${name}" is not on npm` : "Could not load versions");
	const data = (await response.json()) as { versions?: Record<string, unknown> };
	return Object.keys(data.versions ?? {}).reverse();
});

/** Keyed by `name@version`; the version never contains `@`. */
const fetchTypes = memoize(async (key: string): Promise<string | null> => {
	const at = key.lastIndexOf("@");
	const name = key.slice(0, at);
	const version = key.slice(at + 1);
	return (await bundledTypes(name, version)) ?? (await definitelyTyped(name));
});

/** The package's own declarations, else its DefinitelyTyped entry point; `null` when neither exists. */
export function getTypes({ name, version }: PackageSpec): Promise<string | null> {
	return fetchTypes(`${name}@${version}`).catch(() => null);
}

async function text(url: string): Promise<string | null> {
	const response = await get(url);
	return response.ok ? response.text() : null;
}

async function bundledTypes(name: string, version: string): Promise<string | null> {
	const response = await get(`${CDN}/${name}@${version}/package.json`);
	if (!response.ok) return null;
	const manifest = (await response.json()) as { types?: unknown; typings?: unknown };
	const path = manifest.types ?? manifest.typings;
	if (typeof path !== "string" || path.includes("..")) return null;
	return text(`${CDN}/${name}@${version}/${path.replace(/^\.\//, "")}`);
}

function definitelyTyped(name: string): Promise<string | null> {
	const typesName = name.startsWith("@") ? name.slice(1).replace("/", "__") : name;
	return text(`${CDN}/@types/${typesName}/index.d.ts`);
}
