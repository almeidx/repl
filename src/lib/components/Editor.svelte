<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { theme } from '$lib/stores/theme'
  import { packages, type Package } from '$lib/stores/packages'
  import { fetchPackageTypes } from '$lib/utils/types'
  import { get } from 'svelte/store'

  interface Props {
    value: string
  }

  type MonacoWindow = Window & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    require?: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __monacoLoaderPromise?: Promise<any>
  }

  const MONACO_BASE_URL = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min'
  const MONACO_LOADER_URL = `${MONACO_BASE_URL}/vs/loader.js`
  const MONACO_LOAD_TIMEOUT_MS = 15000

  let { value = $bindable() }: Props = $props()

  let container = $state<HTMLDivElement | null>(null)
  let loadError = $state<string | null>(null)
  // Monaco loaded dynamically from CDN - types not available at compile time
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let editor: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let monaco: any = null
  let unsubscribeTheme: (() => void) | null = null
  let unsubscribePackages: (() => void) | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typeDisposables = new Map<string, any>()

  onMount(async () => {
    try {
      monaco = await loadMonaco()
    } catch (e) {
      loadError = e instanceof Error ? e.message : 'Failed to load Monaco editor'
      return
    }

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2022,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      allowSyntheticDefaultImports: true,
      noEmit: true
    })

    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false
    })

    monaco.languages.typescript.typescriptDefaults.setEagerModelSync(false)

    if (!container) {
      loadError = 'Editor container failed to initialize'
      return
    }

    editor = monaco.editor.create(container, {
      value,
      language: 'typescript',
      theme: get(theme) === 'dark' ? 'vs-dark' : 'vs',
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      wordWrap: 'on',
      padding: { top: 12 }
    })

    editor.onDidChangeModelContent(() => {
      value = editor.getValue()
    })

    unsubscribeTheme = theme.subscribe(t => {
      if (monaco && editor) {
        monaco.editor.setTheme(t === 'dark' ? 'vs-dark' : 'vs')
      }
    })

    unsubscribePackages = packages.subscribe(pkgs => {
      if (monaco) syncPackageTypes(pkgs)
    })
  })

  async function syncPackageTypes(pkgs: Package[]) {
    const installedNames = new Set(pkgs.filter(p => p.status === 'installed').map(p => p.name))

    for (const name of typeDisposables.keys()) {
      if (!installedNames.has(name)) {
        typeDisposables.get(name)?.dispose()
        typeDisposables.delete(name)
      }
    }

    for (const pkg of pkgs) {
      if (pkg.status === 'installed' && !typeDisposables.has(pkg.name)) {
        const types = await fetchPackageTypes(pkg.name, pkg.version)
        if (types && monaco) {
          const disposable = monaco.languages.typescript.typescriptDefaults.addExtraLib(
            types,
            `file:///node_modules/${pkg.name}/index.d.ts`
          )
          typeDisposables.set(pkg.name, disposable)
        }
      }
    }
  }

  onDestroy(() => {
    editor?.dispose()
    unsubscribeTheme?.()
    unsubscribePackages?.()
    typeDisposables.forEach(d => d.dispose())
  })

  $effect(() => {
    if (editor && editor.getValue() !== value) {
      editor.setValue(value)
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function loadMonaco(): Promise<any> {
    const monacoWindow = window as MonacoWindow

    if (monacoWindow.__monacoLoaderPromise) {
      return monacoWindow.__monacoLoaderPromise
    }

    monacoWindow.__monacoLoaderPromise = new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        reject(new Error('Timed out loading Monaco editor'))
      }, MONACO_LOAD_TIMEOUT_MS)

      const clearLoadTimeout = () => {
        clearTimeout(timeout)
      }

      const initializeMonaco = () => {
        const req = monacoWindow.require
        if (!req) {
          clearLoadTimeout()
          reject(new Error('Monaco loader unavailable'))
          return
        }

        req.config({
          paths: { vs: `${MONACO_BASE_URL}/vs` }
        })
        req(
          ['vs/editor/editor.main'],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (loadedMonaco: any) => {
            clearLoadTimeout()
            resolve(loadedMonaco)
          },
          () => {
            clearLoadTimeout()
            reject(new Error('Failed to load Monaco editor'))
          }
        )
      }

      const existingLoader = document.querySelector<HTMLScriptElement>('script[data-monaco-loader="true"]')
      if (existingLoader) {
        if (monacoWindow.require) {
          initializeMonaco()
          return
        }

        existingLoader.addEventListener('load', initializeMonaco, { once: true })
        existingLoader.addEventListener(
          'error',
          () => {
            clearLoadTimeout()
            reject(new Error('Failed to load Monaco editor script'))
          },
          { once: true }
        )
        return
      }

      const script = document.createElement('script')
      script.src = MONACO_LOADER_URL
      script.crossOrigin = 'anonymous'
      script.dataset.monacoLoader = 'true'
      script.onload = initializeMonaco
      script.onerror = () => {
        clearLoadTimeout()
        reject(new Error('Failed to load Monaco editor script'))
      }
      document.head.appendChild(script)
    }).catch((error) => {
      monacoWindow.__monacoLoaderPromise = undefined
      throw error
    })

    return monacoWindow.__monacoLoaderPromise
  }
</script>

{#if loadError}
  <div class="flex-1 min-w-0 h-full p-4 bg-bg-primary text-error">
    {loadError}. Check your network connection and refresh.
  </div>
{:else}
  <div class="flex-1 min-w-0 h-full" bind:this={container}></div>
{/if}
