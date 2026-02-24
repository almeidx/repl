import { writable, get } from 'svelte/store'
import { WebContainer } from '@webcontainer/api'

export interface ContainerState {
  status: 'idle' | 'booting' | 'ready' | 'running' | 'installing' | 'error'
  error?: string
}

export const containerState = writable<ContainerState>({ status: 'idle' })

let webcontainer: WebContainer | null = null
let currentProcess: Awaited<ReturnType<WebContainer['spawn']>> | null = null
let executionTimeout: ReturnType<typeof setTimeout> | null = null
let bootPromise: Promise<void> | null = null
let activeTask: 'running' | 'packages' | null = null

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
    const exitCode = await installProcess.exit
    if (exitCode !== 0) {
      throw new Error('Failed to install runtime dependencies')
    }

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

function clearExecutionTimeout(): void {
  if (executionTimeout) {
    clearTimeout(executionTimeout)
    executionTimeout = null
  }
}

function setReadyState(): void {
  if (get(containerState).status !== 'error') {
    containerState.set({ status: 'ready' })
  }
}

function tryAcquireTask(task: 'running' | 'packages'): boolean {
  if (activeTask) return false
  activeTask = task
  return true
}

function releaseTask(task: 'running' | 'packages'): void {
  if (activeTask === task) {
    activeTask = null
  }
}

export async function runCode(code: string, onOutput: (data: string) => void): Promise<void> {
  try {
    await ensureBooted()
  } catch (e) {
    onOutput(`\n\x1b[31mError: ${e instanceof Error ? e.message : 'Failed to start runtime'}\x1b[0m\n`)
    return
  }

  if (!tryAcquireTask('running')) {
    onOutput('\n\x1b[33mContainer is busy. Please wait for the current task to finish.\x1b[0m\n')
    return
  }

  if (get(containerState).status !== 'ready') {
    releaseTask('running')
    return
  }

  containerState.set({ status: 'running' })

  try {
    await webcontainer!.fs.writeFile('index.ts', code)

    currentProcess = await webcontainer!.spawn('./node_modules/.bin/tsx', ['index.ts'])

    const outputPipe = currentProcess.output.pipeTo(new WritableStream({
      write(data) {
        onOutput(data)
      }
    })).catch(() => {
      // Stream may close abruptly when process is terminated; safe to ignore.
    })

    executionTimeout = setTimeout(() => {
      onOutput('\n\x1b[33mExecution timed out after 30 seconds\x1b[0m\n')
      stopExecution()
    }, EXECUTION_TIMEOUT_MS)

    const exitCode = await currentProcess.exit
    await outputPipe

    if (exitCode !== 0) {
      onOutput(`\n\x1b[31mProcess exited with code ${exitCode}\x1b[0m\n`)
    }
  } catch (e) {
    onOutput(`\n\x1b[31mError: ${e instanceof Error ? e.message : 'Unknown error'}\x1b[0m\n`)
  } finally {
    clearExecutionTimeout()
    currentProcess = null
    releaseTask('running')
    setReadyState()
  }
}

export function stopExecution(): void {
  clearExecutionTimeout()
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

  if (!tryAcquireTask('packages')) throw new Error('Container busy')

  if (get(containerState).status !== 'ready') {
    releaseTask('packages')
    throw new Error('Container busy')
  }

  containerState.set({ status: 'installing' })

  try {
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
  } finally {
    releaseTask('packages')
    setReadyState()
  }
}

export async function uninstallPackageInContainer(name: string): Promise<void> {
  await ensureBooted()

  if (!tryAcquireTask('packages')) throw new Error('Container busy')

  if (get(containerState).status !== 'ready') {
    releaseTask('packages')
    throw new Error('Container busy')
  }

  containerState.set({ status: 'installing' })

  try {
    const uninstallProcess = await webcontainer!.spawn('npm', ['uninstall', name])
    const exitCode = await uninstallProcess.exit
    if (exitCode !== 0) {
      throw new Error(`Failed to remove ${name}`)
    }
  } finally {
    releaseTask('packages')
    setReadyState()
  }
}
