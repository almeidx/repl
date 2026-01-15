<script lang="ts">
	import type { ContainerState } from "$lib/utils/webcontainer";
	import type { Theme } from "$lib/stores/theme";

	interface Props {
		state: ContainerState;
		theme: Theme;
		onrun: () => void;
		onstop: () => void;
		onshare: () => void;
		ontoggletheme: () => void;
	}

	let { state, theme, onrun, onstop, onshare, ontoggletheme }: Props = $props();

	const isIdle = $derived(state.status === "idle");
	const isBooting = $derived(state.status === "booting");
	const isReady = $derived(state.status === "ready");
	const isRunning = $derived(state.status === "running");
	const canRun = $derived(isIdle || isReady);
</script>

<div class="toolbar">
	<div class="left">
		<button class="run-btn" onclick={onrun} disabled={!canRun} title="Run (Cmd+Enter)">
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
			<button class="stop-btn" onclick={onstop} title="Stop (Cmd+.)"> ◼ Stop </button>
		{/if}
	</div>

	<div class="right">
		<a class="icon-btn" href="https://github.com/almeidx/repl" target="_blank" rel="noopener noreferrer" title="GitHub">
			<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
				<path
					d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
				/>
			</svg>
		</a>
		<a class="icon-btn" href="https://almeidx.dev" target="_blank" rel="noopener noreferrer" title="almeidx.dev">
			<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
				<path
					d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49c.062.89.291 1.733.656 2.5H3.82zm6.853 3.472A7.024 7.024 0 0 0 13.745 12H11.91a9.27 9.27 0 0 1-.64 1.539 6.688 6.688 0 0 1-.597.933zM8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855.173-.324.33-.682.468-1.068H8.5zm3.68-1h2.146c.365-.767.594-1.61.656-2.5h-2.49a13.65 13.65 0 0 1-.312 2.5zm2.802-3.5a6.959 6.959 0 0 0-.656-2.5H12.18c.174.782.282 1.623.312 2.5h2.49zM11.27 2.461c.247.464.462.98.64 1.539h1.835a7.024 7.024 0 0 0-3.072-2.472c.218.284.418.598.597.933zM10.855 4a7.966 7.966 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4h2.355z"
				/>
			</svg>
		</a>
		<button class="icon-btn" onclick={onshare} title="Copy share URL (Cmd+Shift+C)">
			<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
				<path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.002 1.002 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4.018 4.018 0 0 1-.128-1.287z" />
				<path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243L6.586 4.672z" />
			</svg>
		</button>
		<button class="icon-btn" onclick={ontoggletheme} title="Toggle theme">
			{#if theme === "dark"}
				<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
					<path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z" />
				</svg>
			{:else}
				<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
					<path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z" />
				</svg>
			{/if}
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

	.left,
	.right {
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
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-primary);
		text-decoration: none;
		border-radius: 3px;
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
		to {
			transform: rotate(360deg);
		}
	}
</style>
