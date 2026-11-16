<script lang="ts" module>
	/** Who asked: the user, or a shared link being opened. */
	export type InstallSource = 'manual' | 'share';
</script>

<script lang="ts">
	import type { PackageSpec } from '#lib/npm.js';
	import type { InstallOptions } from '#lib/runtime.svelte.js';

	type Decision = InstallOptions | null;

	let dialog: HTMLDialogElement;
	let request = $state.raw<{ source: InstallSource; packages: PackageSpec[]; resolve: (decision: Decision) => void } | null>(null);
	let allowScripts = $state(false);

	export function isOpen(): boolean {
		return request !== null;
	}

	/** Asks before anything is installed; resolves `null` when dismissed. A new request dismisses the previous one. */
	export function confirm(source: InstallSource, packages: PackageSpec[]): Promise<Decision> {
		settle(null);
		const { promise, resolve } = Promise.withResolvers<Decision>();
		request = { source, packages, resolve };
		allowScripts = false;
		dialog.showModal();
		return promise;
	}

	function settle(decision: Decision) {
		const current = request;
		request = null;
		if (dialog.open) dialog.close();
		current?.resolve(decision);
	}
</script>

<!-- Escape fires `cancel`; a click on the backdrop targets the dialog element itself. -->
<dialog
	bind:this={dialog}
	aria-labelledby="install-title"
	class="m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl border border-border bg-surface text-fg shadow-xl shadow-black/30 backdrop:bg-black/50"
	oncancel={(event) => {
		event.preventDefault();
		settle(null);
	}}
	onclick={(event) => {
		if (event.target === dialog) settle(null);
	}}
>
	{#if request}
		<div class="p-5">
			<h2 id="install-title" class="text-base font-semibold">Install {request.packages.length === 1 ? 'package' : 'packages'}?</h2>
			<p class="mt-1 text-sm text-muted">
				{request.source === 'share' ? 'This shared link installs' : 'This installs'} into the sandbox in this tab.
			</p>
			<ul class="mt-4 max-h-40 divide-y divide-border overflow-auto rounded-lg border border-border bg-bg">
				{#each request.packages as spec (spec.name)}
					<li class="flex items-center justify-between gap-2 px-3 py-1.5 font-mono text-sm">
						<span class="truncate">{spec.name}</span>
						<span class="shrink-0 text-muted">{spec.version}</span>
					</li>
				{/each}
			</ul>
			<label class="mt-4 flex items-start gap-2 text-sm">
				<input type="checkbox" class="mt-1 accent-accent" bind:checked={allowScripts} />
				<span>
					Allow lifecycle scripts
					<span class="block text-xs text-muted">Runs <code>preinstall</code>, <code>install</code> and <code>postinstall</code>. Only for packages you trust.</span>
				</span>
			</label>
			<div class="mt-5 flex justify-end gap-2">
				<button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-raised" onclick={() => settle(null)}>Cancel</button>
				<button type="button" class="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90" onclick={() => settle({ allowScripts })}>
					Install
				</button>
			</div>
		</div>
	{/if}
</dialog>
