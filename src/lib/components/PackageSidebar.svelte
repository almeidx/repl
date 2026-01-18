<script lang="ts">
	import type { Package } from "$lib/stores/packages";
	import { fetchPackageVersions } from "$lib/utils/npm";

	interface Props {
		packages: Package[];
		oninstall: (name: string, version: string) => void;
		onremove: (name: string) => void;
		width?: number;
	}

	let { packages, oninstall, onremove, width = 260 }: Props = $props();

	let packageName = $state("");
	let selectedVersion = $state<string | null>(null);
	let versions = $state<string[]>([]);
	let showVersionPicker = $state(false);
	let loadingVersions = $state(false);
	let versionError = $state<string | null>(null);

	async function handleVersionClick() {
		if (!packageName.trim()) return;

		if (showVersionPicker) {
			showVersionPicker = false;
			return;
		}

		loadingVersions = true;
		versionError = null;
		versions = [];

		try {
			const result = await fetchPackageVersions(packageName.trim());
			versions = result.versions;
			showVersionPicker = true;
		} catch (e) {
			versionError = e instanceof Error ? e.message : "Failed to fetch versions";
		} finally {
			loadingVersions = false;
		}
	}

	function selectVersion(version: string) {
		selectedVersion = version;
		showVersionPicker = false;
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (!packageName.trim()) return;

		oninstall(packageName.trim(), selectedVersion || "latest");
		packageName = "";
		selectedVersion = null;
		versions = [];
		showVersionPicker = false;
	}

	function handleNameChange() {
		selectedVersion = null;
		versions = [];
		showVersionPicker = false;
		versionError = null;
	}
</script>

<div class="sidebar min-w-[150px] shrink-0 bg-bg-secondary border-l border-border flex flex-col overflow-hidden" style="width: {width}px">
	<div class="px-3 py-2 font-medium border-b border-border text-text-secondary text-[11px] uppercase tracking-wider">Packages</div>

	<form class="flex flex-wrap gap-1 p-2 border-b border-border" onsubmit={handleSubmit}>
		<input
			type="text"
			bind:value={packageName}
			oninput={handleNameChange}
			placeholder="Package name"
			class="flex-1 min-w-[80px] h-7"
		/>
		<div class="relative">
			<button
				type="button"
				class="min-w-[60px] px-2 py-1 text-xs flex items-center justify-center gap-1 border border-accent h-7"
				onclick={handleVersionClick}
				disabled={!packageName.trim() || loadingVersions}
				title={selectedVersion ? `Version: ${selectedVersion}` : "Select version (optional)"}
			>
				{#if loadingVersions}
					<span class="size-2.5 border-2 border-transparent border-t-current rounded-full animate-spin"></span>
				{:else if selectedVersion}
					{selectedVersion}
				{:else}
					latest
				{/if}
			</button>
			{#if showVersionPicker && versions.length > 0}
				<div class="absolute top-full right-0 min-w-[180px] max-h-[200px] overflow-y-auto bg-bg-primary border border-border rounded shadow-[0_4px_12px_rgba(0,0,0,0.15)] z-[100] mt-0.5">
					<button
						type="button"
						class="block w-full px-2 py-1.5 text-left bg-transparent border-none rounded-none text-xs cursor-pointer text-text-primary hover:bg-bg-tertiary"
						class:bg-accent={!selectedVersion}
						class:text-white={!selectedVersion}
						onclick={() => selectVersion("")}
					>
						latest
					</button>
					{#each versions.slice(0, 50) as version}
						<button
							type="button"
							class="block w-full px-2 py-1.5 text-left bg-transparent border-none rounded-none text-xs cursor-pointer text-text-primary hover:bg-bg-tertiary"
							class:bg-accent={selectedVersion === version}
							class:text-white={selectedVersion === version}
							onclick={() => selectVersion(version)}
						>
							{version}
						</button>
					{/each}
				</div>
			{/if}
		</div>
		<button type="submit" class="px-3 h-7" disabled={!packageName.trim()}>Add</button>
	</form>

	{#if versionError}
		<div class="px-2 py-1.5 text-[11px] text-error bg-error/10">{versionError}</div>
	{/if}

	<div class="flex-1 overflow-y-auto">
		{#each packages as pkg (pkg.name)}
			<div class="group flex items-center px-3 py-1.5 gap-1 border-b border-border {pkg.status === 'error' ? 'bg-error/10' : ''}"
			>
				<span class="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{pkg.name}</span>
				{#if pkg.status === "installing"}
					<span class="size-3 border-2 border-border border-t-accent rounded-full animate-spin"></span>
				{:else}
					<span class="text-text-secondary text-[11px]">@{pkg.version}</span>
				{/if}
				<button
					class="bg-transparent px-1.5 py-0.5 text-base leading-none opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error"
					onclick={() => onremove(pkg.name)}
					title="Remove"
				>×</button>
			</div>
		{/each}
	</div>
</div>
