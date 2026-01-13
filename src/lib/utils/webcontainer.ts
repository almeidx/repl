import { writable, get } from 'svelte/store'
import { WebContainer } from '@webcontainer/api'

export interface ContainerState {
  status: 'idle' | 'booting' | 'ready' | 'running' | 'error'
  error?: string
}

export const containerState = writable<ContainerState>({ status: 'idle' })

let webcontainer: WebContainer | null = null
let currentProcess: Awaited<ReturnType<WebContainer['spawn']>> | null = null
let executionTimeout: ReturnType<typeof setTimeout> | null = null
let bootPromise: Promise<void> | null = null

const EXECUTION_TIMEOUT_MS = 30000

const FILES = {
  'package.json': {
    file: {
      contents: JSON.stringify({
        name: 'repl-sandbox',
        type: 'module',
        dependencies: {
          tsx: '^4.21.0'
        }
      }, null, 2)
    }
  },
  'tsconfig.json': {
    file: {
      contents: JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'bundler',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true
        }
      }, null, 2)
    }
  }
}

async function bootContainer(): Promise<void> {
  containerState.set({ status: 'booting' })

  try {
    webcontainer = await WebContainer.boot()
    await webcontainer.mount(FILES)

    const installProcess = await webcontainer.spawn('npm', ['install'])
    await installProcess.exit

    containerState.set({ status: 'ready' })
  } catch (e) {
    containerState.set({
      status: 'error',
      error: 'Failed to start. Try refreshing the page.'
    })
    throw e
  }
}

export async function ensureBooted(): Promise<void> {
  const state = get(containerState)
  if (state.status === 'ready' || state.status === 'running') return
  if (state.status === 'error') throw new Error(state.error)

  if (!bootPromise) {
    bootPromise = bootContainer()
  }
  await bootPromise
}

export async function runCode(code: string, onOutput: (data: string) => void): Promise<void> {
  await ensureBooted()

  if (get(containerState).status !== 'ready') return

  containerState.set({ status: 'running' })

  try {
    await webcontainer!.fs.writeFile('index.ts', code)

    currentProcess = await webcontainer!.spawn('./node_modules/.bin/tsx', ['index.ts'])

    currentProcess.output.pipeTo(new WritableStream({
      write(data) {
        onOutput(data)
      }
    }))

    executionTimeout = setTimeout(() => {
      onOutput('\n\x1b[33mExecution timed out after 30 seconds\x1b[0m\n')
      stopExecution()
    }, EXECUTION_TIMEOUT_MS)

    const exitCode = await currentProcess.exit

    if (executionTimeout) {
      clearTimeout(executionTimeout)
      executionTimeout = null
    }

    if (exitCode !== 0) {
      onOutput(`\n\x1b[31mProcess exited with code ${exitCode}\x1b[0m\n`)
    }
  } catch (e) {
    onOutput(`\n\x1b[31mError: ${e instanceof Error ? e.message : 'Unknown error'}\x1b[0m\n`)
  } finally {
    currentProcess = null
    containerState.set({ status: 'ready' })
  }
}

export function stopExecution(): void {
  if (executionTimeout) {
    clearTimeout(executionTimeout)
    executionTimeout = null
  }
  if (currentProcess) {
    currentProcess.kill()
    currentProcess = null
  }
  if (get(containerState).status === 'running') {
    containerState.set({ status: 'ready' })
  }
}

export async function installPackageInContainer(name: string, version: string): Promise<string> {
  await ensureBooted()

  if (get(containerState).status !== 'ready') throw new Error('Container busy')

  const pkgSpec = version === 'latest' ? name : `${name}@${version}`
  const installProcess = await webcontainer!.spawn('npm', ['install', '--save', pkgSpec])

  const exitCode = await installProcess.exit
  if (exitCode !== 0) {
    throw new Error(`Failed to install ${pkgSpec}`)
  }

  const pkgJsonContent = await webcontainer!.fs.readFile('package.json', 'utf-8')
  const pkgJson = JSON.parse(pkgJsonContent)
  const installedVersion = pkgJson.dependencies?.[name]

  if (installedVersion) {
    return installedVersion.replace(/^[\^~]/, '')
  }
  return version === 'latest' ? 'latest' : version
}
