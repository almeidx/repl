<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { theme } from '$lib/stores/theme'
  import { packages, type Package } from '$lib/stores/packages'
  import { fetchPackageTypes } from '$lib/utils/types'
  import { get } from 'svelte/store'

  interface Props {
    value: string
  }

  let { value = $bindable() }: Props = $props()

  let container: HTMLDivElement
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
    monaco = await loadMonaco()

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
    return new Promise((resolve) => {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs/loader.js'
      script.crossOrigin = 'anonymous'
      script.onload = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const req = (window as any).require
        req.config({
          paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs' }
        })
        req(['vs/editor/editor.main'], resolve)
      }
      document.head.appendChild(script)
    })
  }
</script>

<div class="flex-1 min-w-0 h-full" bind:this={container}></div>
