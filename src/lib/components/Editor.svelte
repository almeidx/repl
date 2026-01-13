<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { theme } from '$lib/stores/theme'
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
  })

  onDestroy(() => {
    editor?.dispose()
    unsubscribeTheme?.()
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

<div class="editor-container" bind:this={container}></div>

<style>
  .editor-container {
    flex: 1;
    min-width: 0;
    height: 100%;
  }
</style>
