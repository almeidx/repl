<script lang="ts">
	import * as dialog from "@zag-js/dialog";
	import { useMachine } from "@zag-js/svelte";
	import { zagNormalizeProps } from "$lib/ui/zag/props";

	interface PackageToInstall {
		name: string;
		version: string;
	}

	interface Props {
		id: string;
		open: boolean;
		source: "manual" | "share";
		packages: PackageToInstall[];
		onconfirm: (allowScripts: boolean) => void;
		oncancel: () => void;
	}

	let { id, open, source, packages, onconfirm, oncancel }: Props = $props();

	let allowScripts = $state(false);
	let confirmedThisCycle = false;

	const service = useMachine(dialog.machine, () => ({
		id,
		open,
		role: "dialog" as const,
		modal: true,
		closeOnEscape: true,
		closeOnInteractOutside: true,
		onOpenChange(details) {
			if (details.open) {
				confirmedThisCycle = false;
				return;
			}
			if (!confirmedThisCycle) {
				oncancel();
			}
		},
	}));

	const api = $derived.by(() => dialog.connect(service, zagNormalizeProps));
	const sourceLabel = $derived(source === "share" ? "shared link" : "manual install");

	$effect(() => {
		if (open) {
			allowScripts = false;
			confirmedThisCycle = false;
		}
	});

	function handleConfirm() {
		confirmedThisCycle = true;
		onconfirm(allowScripts);
	}
</script>

{#if api.open}
	<div {...api.getBackdropProps()} class="fixed inset-0 bg-black/50 z-[190]"></div>

	<div {...api.getPositionerProps()} class="fixed inset-0 z-[200] flex items-center justify-center p-4">
		<div {...api.getContentProps()} class="w-full max-w-md rounded border border-border bg-bg-secondary shadow-xl">
			<div class="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
				<h2 {...api.getTitleProps()} class="text-base font-medium">Confirm Package Install</h2>
				<button {...api.getCloseTriggerProps()} type="button" class="bg-transparent text-text-primary px-2 py-1" aria-label="Close install dialog">
					×
				</button>
			</div>

			<p {...api.getDescriptionProps()} class="px-4 py-3 text-sm text-text-secondary">
				Installing from {sourceLabel}. Review packages and choose whether lifecycle scripts should run.
			</p>

			<ul class="mx-4 mb-3 max-h-36 overflow-auto rounded border border-border bg-bg-primary text-sm">
				{#each packages as pkg}
					<li class="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border last:border-b-0">
						<span class="truncate">{pkg.name}</span>
						<span class="text-text-secondary">@{pkg.version}</span>
					</li>
				{/each}
			</ul>

			<div class="px-4 py-2">
				<label class="flex items-start gap-2 text-sm">
					<input type="checkbox" bind:checked={allowScripts} class="mt-0.5" />
					<span>Allow npm lifecycle scripts (`preinstall`, `install`, `postinstall`).</span>
				</label>
			</div>

			<div class="px-4 py-3 border-t border-border flex items-center justify-end gap-2">
				<button {...api.getCloseTriggerProps()} type="button" class="bg-transparent text-text-primary border border-border">
					Cancel
				</button>
				<button type="button" onclick={handleConfirm}>
					Install
				</button>
			</div>
		</div>
	</div>
{/if}
