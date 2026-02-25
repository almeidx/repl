const JSDELIVR_BASE = "https://cdn.jsdelivr.net/npm";

interface PackageJson {
	types?: string;
	typings?: string;
	main?: string;
}

export async function fetchPackageTypes(name: string, version: string): Promise<string | null> {
	const pkgVersion = version === "latest" ? "latest" : version;

	const bundledTypes = await tryFetchBundledTypes(name, pkgVersion);
	if (bundledTypes) return bundledTypes;

	const dtTypes = await tryFetchDefinitelyTyped(name);
	if (dtTypes) return dtTypes;

	return null;
}

async function tryFetchBundledTypes(name: string, version: string): Promise<string | null> {
	try {
		const pkgJsonUrl = `${JSDELIVR_BASE}/${name}@${version}/package.json`;
		const res = await fetch(pkgJsonUrl);
		if (!res.ok) return null;

		const pkgJson: PackageJson = await res.json();
		const typesPath = pkgJson.types || pkgJson.typings;

		if (!typesPath) return null;

		const typesUrl = `${JSDELIVR_BASE}/${name}@${version}/${typesPath}`;
		const typesRes = await fetch(typesUrl);
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
		const res = await fetch(indexUrl);
		if (!res.ok) return null;

		return await res.text();
	} catch {
		return null;
	}
}
