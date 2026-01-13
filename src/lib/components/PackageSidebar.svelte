<script lang="ts">
  import type { Package } from '$lib/stores/packages'
  import { fetchPackageVersions } from '$lib/utils/npm'

  interface Props {
    packages: Package[]
    oninstall: (name: string, version: string) => void
    onremove: (name: string) => void
    width?: number
  }

  let { packages, oninstall, onremove, width = 260 }: Props = $props()

  let packageName = $state('')
  let selectedVersion = $state<string | null>(null)
  let versions = $state<string[]>([])
  let showVersionPicker = $state(false)
  let loadingVersions = $state(false)
  let versionError = $state<string | null>(null)

  async function handleVersionClick() {
    if (!packageName.trim()) return

    if (showVersionPicker) {
      showVersionPicker = false
      return
    }

    loadingVersions = true
    versionError = null
    versions = []

    try {
      const result = await fetchPackageVersions(packageName.trim())
      versions = result.versions
      showVersionPicker = true
    } catch (e) {
      versionError = e instanceof Error ? e.message : 'Failed to fetch versions'
    } finally {
      loadingVersions = false
    }
  }

  function selectVersion(version: string) {
    selectedVersion = version
    showVersionPicker = false
  }

  function handleSubmit(e: Event) {
    e.preventDefault()
    if (!packageName.trim()) return

    oninstall(packageName.trim(), selectedVersion || 'latest')
    packageName = ''
    selectedVersion = null
    versions = []
    showVersionPicker = false
  }

  function handleNameChange() {
    selectedVersion = null
    versions = []
    showVersionPicker = false
    versionError = null
  }
</script>

<div class="sidebar" style="width: {width}px">
  <div class="header">Packages</div>

  <form class="add-form" onsubmit={handleSubmit}>
    <input
      type="text"
      bind:value={packageName}
      oninput={handleNameChange}
      placeholder="Package name"
      class="name-input"
    />
    <div class="version-picker">
      <button
        type="button"
        class="version-btn"
        onclick={handleVersionClick}
        disabled={!packageName.trim() || loadingVersions}
        title={selectedVersion ? `Version: ${selectedVersion}` : 'Select version (optional)'}
      >
        {#if loadingVersions}
          <span class="btn-spinner"></span>
        {:else if selectedVersion}
          {selectedVersion}
        {:else}
          latest
        {/if}
      </button>
      {#if showVersionPicker && versions.length > 0}
        <div class="version-dropdown">
          <button
            type="button"
            class="version-option"
            class:selected={!selectedVersion}
            onclick={() => selectVersion('')}
          >
            latest
          </button>
          {#each versions.slice(0, 50) as version}
            <button
              type="button"
              class="version-option"
              class:selected={selectedVersion === version}
              onclick={() => selectVersion(version)}
            >
              {version}
            </button>
          {/each}
        </div>
      {/if}
    </div>
    <button type="submit" class="add-btn" disabled={!packageName.trim()}>Add</button>
  </form>

  {#if versionError}
    <div class="version-error">{versionError}</div>
  {/if}

  <div class="package-list">
    {#each packages as pkg (pkg.name)}
      <div class="package" class:error={pkg.status === 'error'}>
        <span class="pkg-name">{pkg.name}</span>
        {#if pkg.status === 'installing'}
          <span class="pkg-spinner"></span>
        {:else}
          <span class="pkg-version">@{pkg.version}</span>
        {/if}
        <button class="remove-btn" onclick={() => onremove(pkg.name)} title="Remove">×</button>
      </div>
    {/each}
  </div>
</div>

<style>
  .sidebar {
    min-width: 150px;
    flex-shrink: 0;
    background-color: var(--bg-secondary);
    border-left: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .header {
    padding: 8px 12px;
    font-weight: 500;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-secondary);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .add-form {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 8px;
    border-bottom: 1px solid var(--border-color);
  }

  .name-input {
    flex: 1;
    min-width: 80px;
  }

  .version-picker {
    position: relative;
  }

  .version-btn {
    min-width: 60px;
    padding: 6px 8px;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }

  .version-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    min-width: 100px;
    max-height: 200px;
    overflow-y: auto;
    background-color: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 100;
    margin-top: 2px;
  }

  .version-option {
    display: block;
    width: 100%;
    padding: 6px 8px;
    text-align: left;
    background: transparent;
    border: none;
    border-radius: 0;
    font-size: 12px;
    cursor: pointer;
    color: var(--text-primary);
  }

  .version-option:hover {
    background-color: var(--bg-tertiary);
  }

  .version-option.selected {
    background-color: var(--accent-color);
    color: white;
  }

  .add-btn {
    padding: 6px 12px;
  }

  .version-error {
    padding: 6px 8px;
    font-size: 11px;
    color: var(--error-color);
    background-color: rgba(241, 76, 76, 0.1);
  }

  .btn-spinner {
    width: 10px;
    height: 10px;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .package-list {
    flex: 1;
    overflow-y: auto;
  }

  .package {
    display: flex;
    align-items: center;
    padding: 6px 12px;
    gap: 4px;
    border-bottom: 1px solid var(--border-color);
  }

  .package.error {
    background-color: rgba(241, 76, 76, 0.1);
  }

  .pkg-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pkg-version {
    color: var(--text-secondary);
    font-size: 11px;
  }

  .pkg-spinner {
    width: 12px;
    height: 12px;
    border: 2px solid var(--border-color);
    border-top-color: var(--accent-color);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .remove-btn {
    background: transparent;
    padding: 2px 6px;
    font-size: 16px;
    line-height: 1;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .package:hover .remove-btn {
    opacity: 1;
  }

  .remove-btn:hover {
    background-color: var(--error-color);
  }
</style>
