import type { Package } from '$lib/stores/packages'
import { replaceState } from '$app/navigation'

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

export function encodeShareUrl(code: string, packages: Package[]): string {
  const encoded = encodeShareData(code, packages)
  return `${window.location.origin}${window.location.pathname}#${encoded}`
}

export function updateUrlHash(code: string, packages: Package[]): void {
  const encoded = encodeShareData(code, packages)
  replaceState(`#${encoded}`, {})
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
