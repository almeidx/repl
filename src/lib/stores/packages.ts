import { writable, get } from 'svelte/store'
import { installPackageInContainer } from '$lib/utils/webcontainer'

export interface Package {
  name: string
  version: string
  status: 'installing' | 'installed' | 'error'
}

export const packages = writable<Package[]>([])

export async function installPackage(name: string, version: string = 'latest') {
  const current = get(packages)
  const existing = current.find(p => p.name === name)

  if (existing) {
    packages.update(p =>
      p.map(pkg => pkg.name === name ? { ...pkg, version, status: 'installing' } : pkg)
    )
  } else {
    packages.update(p => [...p, { name, version, status: 'installing' }])
  }

  try {
    const installedVersion = await installPackageInContainer(name, version)
    packages.update(p =>
      p.map(pkg =>
        pkg.name === name
          ? { ...pkg, version: installedVersion, status: 'installed' }
          : pkg
      )
    )
  } catch (e) {
    packages.update(p =>
      p.map(pkg =>
        pkg.name === name ? { ...pkg, status: 'error' } : pkg
      )
    )
  }
}

export function removePackage(name: string) {
  packages.update(p => p.filter(pkg => pkg.name !== name))
}
