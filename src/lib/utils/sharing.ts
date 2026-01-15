import type { Package } from '$lib/stores/packages'

interface ShareData {
  code: string
  packages?: { name: string; version: string }[]
}

export function encodeShareData(code: string, packages: Package[]): string {
  const data: ShareData = { code }

  const installedPackages = packages
    .filter(p => p.status === 'installed')
    .map(p => ({ name: p.name, version: p.version }))

  if (installedPackages.length > 0) {
    data.packages = installedPackages
  }

  return btoa(encodeURIComponent(JSON.stringify(data)))
}

function buildPackageParams(packages: Package[]): string {
  const installed = packages.filter(p => p.status === 'installed')
  if (installed.length === 0) return ''

  const params = new URLSearchParams()
  for (const pkg of installed) {
    params.append('pkg', `${pkg.name}@${pkg.version}`)
  }
  return params.toString()
}

export function encodeShareUrl(code: string, packages: Package[]): string {
  const encoded = encodeShareData(code, packages)
  const pkgParams = buildPackageParams(packages)
  const query = pkgParams ? `?${pkgParams}` : ''
  return `${window.location.origin}${window.location.pathname}${query}#${encoded}`
}

export function updateUrlHash(code: string, packages: Package[]): void {
  const encoded = encodeShareData(code, packages)
  const pkgParams = buildPackageParams(packages)
  const query = pkgParams ? `?${pkgParams}` : ''
  history.replaceState(null, '', `${query}#${encoded}`)
}

export function decodeShareUrl(): ShareData | null {
  const hash = window.location.hash.slice(1)
  if (!hash) return null

  try {
    const decoded = JSON.parse(decodeURIComponent(atob(hash)))
    return decoded
  } catch {
    return null
  }
}

export function parsePackagesFromUrl(): { name: string; version: string }[] {
  const params = new URLSearchParams(window.location.search)
  const pkgParams = params.getAll('pkg')

  return pkgParams.map(pkg => {
    const atIndex = pkg.lastIndexOf('@')
    if (atIndex > 0) {
      return { name: pkg.slice(0, atIndex), version: pkg.slice(atIndex + 1) }
    }
    return { name: pkg, version: 'latest' }
  })
}
