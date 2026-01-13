<script lang="ts">
  import type { ContainerState } from '$lib/utils/webcontainer'
  import type { Theme } from '$lib/stores/theme'

  interface Props {
    state: ContainerState
    theme: Theme
    onrun: () => void
    onstop: () => void
    onshare: () => void
    ontoggletheme: () => void
  }

  let { state, theme, onrun, onstop, onshare, ontoggletheme }: Props = $props()

  const isIdle = $derived(state.status === 'idle')
  const isBooting = $derived(state.status === 'booting')
  const isReady = $derived(state.status === 'ready')
  const isRunning = $derived(state.status === 'running')
  const canRun = $derived(isIdle || isReady)
</script>

<div class="toolbar">
  <div class="left">
    <button
      class="run-btn"
      onclick={onrun}
      disabled={!canRun}
      title="Run (Cmd+Enter)"
    >
      {#if isBooting}
        <span class="spinner"></span>
        Booting...
      {:else if isRunning}
        <span class="spinner"></span>
        Running...
      {:else if isIdle}
        ▶ Boot & Run
      {:else}
        ▶ Run
      {/if}
    </button>

    {#if isRunning}
      <button class="stop-btn" onclick={onstop} title="Stop (Cmd+.)">
        ◼ Stop
      </button>
    {/if}
  </div>

  <div class="right">
    <button class="icon-btn" onclick={onshare} title="Copy share URL (Cmd+Shift+C)">
      🔗
    </button>
    <button class="icon-btn" onclick={ontoggletheme} title="Toggle theme">
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  </div>
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background-color: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    gap: 8px;
  }

  .left, .right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .run-btn {
    min-width: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .stop-btn {
    background-color: var(--error-color);
  }

  .stop-btn:hover {
    background-color: #d43c3c;
  }

  .icon-btn {
    background: transparent;
    padding: 6px 8px;
    font-size: 16px;
  }

  .icon-btn:hover {
    background-color: var(--bg-tertiary);
  }

  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
