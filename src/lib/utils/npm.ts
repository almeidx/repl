export interface NpmPackageVersions {
  versions: string[]
  latest: string
}

export async function fetchPackageVersions(packageName: string): Promise<NpmPackageVersions> {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`)

  if (!response.ok) {
    throw new Error(`Package "${packageName}" not found`)
  }

  const data = await response.json()
  const versions = Object.keys(data.versions || {}).reverse()
  const latest = data['dist-tags']?.latest || versions[0] || ''

  return { versions, latest }
}
