<script lang="ts">
	import type { Snippet } from 'svelte';
	import ThemeToggle from './ThemeToggle.svelte';

	let { children, actions }: { children?: Snippet; actions?: Snippet } = $props();
</script>

<header class="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4 max-sm:gap-2 max-sm:px-2">
	<a href="/" class="flex items-center gap-1.5 font-semibold tracking-tight text-fg">
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M5 7l5 5-5 5M13 18h6" />
		</svg>
		<span class="max-sm:sr-only">repl</span>
	</a>
	<div class="flex min-w-0 flex-1 items-center gap-3 max-sm:gap-2">
		{@render children?.()}
	</div>
	{@render actions?.()}
	<a
		href="https://github.com/almeidx/repl"
		class="grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-raised hover:text-fg"
		target="_blank"
		rel="noopener"
		aria-label="Source on GitHub"
		title="Source on GitHub"
	>
		<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<path
				d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
			/>
		</svg>
	</a>
	<ThemeToggle />
</header>
