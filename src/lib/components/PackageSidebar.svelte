<script lang="ts">
	import * as combobox from "@zag-js/combobox";
	import { useMachine } from "@zag-js/svelte";
	import type { Package } from "$lib/stores/packages";
	import { fetchPackageVersions } from "$lib/utils/npm";
	import { zagNormalizeProps } from "$lib/ui/zag/props";

	interface Props {
		packages: Package[];
		oninstall: (name: string, version: string) => Promise<void> | void;
		onremove: (name: string) => Promise<void> | void;
		width?: number;
		instanceid: string;
	}

	interface VersionItem {
		label: string;
		value: string;
	}

	let { packages, oninstall, onremove, width = 260, instanceid }: Props = $props();

	let packageName = $state("");
	let selectedVersion = $state<string | null>(null);
	let versions = $state<string[]>([]);
	let loadingVersions = $state(false);
	let versionError = $state<string | null>(null);
	let installError = $state<string | null>(null);
	let loadedVersionsForPackage = $state<string | null>(null);

	const versionItems = $derived.by<VersionItem[]>(() => {
		const items: VersionItem[] = [{ label: "latest", value: "latest" }];
		for (const version of versions) {
			items.push({ label: version, value: version });
		}
		return items;
	});

	const versionCollection = $derived.by(() =>
		combobox.collection<VersionItem>({
			items: versionItems,
			itemToValue: (item) => item.value,
			itemToString: (item) => item.label,
			isItemDisabled: () => false,
		}),
	);

	const versionService = useMachine(combobox.machine, () => ({
		id: `${instanceid}-version`,
		collection: versionCollection,
		allowCustomValue: true,
		selectionBehavior: "replace" as const,
		inputBehavior: "none" as const,
		openOnClick: true,
		openOnChange: false,
		placeholder: "latest",
		translations: {
			triggerLabel: "Toggle package versions",
			clearTriggerLabel: "Clear selected version",
		},
		onOpenChange(details) {
			if (details.open) {
				void ensureVersionsLoaded();
			}
		},
		onValueChange(details) {
			const value = details.value[0];
			selectedVersion = value && value !== "latest" ? value : null;
		},
		onInputValueChange(details) {
			if (details.reason !== "input-change") return;
			const normalized = details.inputValue.trim();
			selectedVersion = normalized && normalized !== "latest" ? normalized : null;
		},
	}));

	const versionApi = $derived.by(() => combobox.connect(versionService, zagNormalizeProps));

	const installingCount = $derived(packages.filter((pkg) => pkg.status === "installing").length);
	const errorPackages = $derived(packages.filter((pkg) => pkg.status === "error"));
	const packageStatusMessage = $derived.by(() => {
		if (installingCount > 0) {
			return `Installing ${installingCount} package${installingCount === 1 ? "" : "s"}...`;
		}
		if (errorPackages.length > 0) {
			return `${errorPackages.length} package${errorPackages.length === 1 ? "" : "s"} failed.`;
		}
		return null;
	});

	function resetVersionState() {
		selectedVersion = null;
		versions = [];
		loadingVersions = false;
		versionError = null;
		loadedVersionsForPackage = null;
		versionApi.setInputValue("", "script");
		versionApi.setValue([]);
		versionApi.setOpen(false);
	}

	function handleNameInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		packageName = input.value;
		resetVersionState();
		installError = null;
	}

	async function ensureVersionsLoaded(force = false) {
		const name = packageName.trim();
		if (!name || loadingVersions) return;
		if (!force && loadedVersionsForPackage === name && versions.length > 0) return;

		loadingVersions = true;
		versionError = null;
		installError = null;

		try {
			const result = await fetchPackageVersions(name);
			const latestRemoved = result.versions.filter((version) => version !== result.latest);
			versions = latestRemoved.slice(0, 50);
			loadedVersionsForPackage = name;
		} catch (error) {
			versions = [];
			loadedVersionsForPackage = null;
			versionError = error instanceof Error ? error.message : "Failed to fetch versions";
		} finally {
			loadingVersions = false;
		}
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		const name = packageName.trim();
		if (!name) return;

		installError = null;
		const version = selectedVersion || "latest";

		try {
			await oninstall(name, version);
			packageName = "";
			resetVersionState();
		} catch (error) {
			installError = error instanceof Error ? error.message : "Failed to add package";
		}
	}
</script>

<div class="sidebar min-w-[150px] shrink-0 bg-bg-secondary border-l border-border flex flex-col overflow-hidden" style="width: {width}px">
	<div class="px-3 py-2 font-medium border-b border-border text-text-secondary text-[11px] uppercase tracking-wider">Packages</div>

	<form class="flex flex-wrap items-start gap-1 p-2 border-b border-border" onsubmit={handleSubmit}>
		<label class="sr-only" for={`${instanceid}-package-name`}>Package name</label>
		<input
			id={`${instanceid}-package-name`}
			type="text"
			value={packageName}
			oninput={handleNameInput}
			placeholder="Package name"
			class="flex-1 min-w-[80px] h-7"
			aria-describedby={`${instanceid}-install-help`}
		/>

		<div {...versionApi.getRootProps()} class="relative min-w-[110px]">
			<div {...versionApi.getControlProps()} class="flex items-center gap-1 rounded border border-border bg-bg-tertiary px-1 h-7">
				<input
					{...versionApi.getInputProps()}
					class="flex-1 bg-transparent border-none outline-none text-xs text-text-primary px-1 min-w-[60px]"
					placeholder="latest"
					disabled={!packageName.trim()}
					aria-label="Package version"
					onfocus={() => ensureVersionsLoaded()}
				/>
				{#if loadingVersions}
					<span class="size-2.5 border-2 border-transparent border-t-current rounded-full animate-spin"></span>
				{/if}
				<button
					{...versionApi.getTriggerProps()}
					type="button"
					class="bg-transparent text-text-secondary px-1 py-0 h-5 min-w-5"
					disabled={!packageName.trim() || loadingVersions}
					aria-label="Toggle package versions"
				>
					▾
				</button>
			</div>

			<div {...versionApi.getPositionerProps()} class="absolute top-full left-0 right-0 mt-0.5 z-[110]">
				<div
					{...versionApi.getContentProps()}
					class="max-h-[220px] overflow-y-auto rounded border border-border bg-bg-primary shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
				>
					<ul {...versionApi.getListProps()}>
						{#each versionItems as item (item.value)}
							{@const itemState = versionApi.getItemState({ item })}
							<li
								{...versionApi.getItemProps({ item })}
								class="px-2 py-1.5 text-xs cursor-pointer text-text-primary hover:bg-bg-tertiary"
								class:bg-accent={itemState.selected}
								class:text-white={itemState.selected}
							>
								<span {...versionApi.getItemTextProps({ item })}>{item.label}</span>
							</li>
						{/each}
					</ul>
				</div>
			</div>
		</div>

		<button type="submit" class="px-3 h-7" disabled={!packageName.trim()}>Add</button>
		<p id={`${instanceid}-install-help`} class="sr-only">
			Package install requires confirmation, including lifecycle script permissions.
		</p>
	</form>

	{#if versionError}
		<div class="px-2 py-1.5 text-[11px] text-error bg-error/10" role="status" aria-live="polite">{versionError}</div>
	{/if}

	{#if installError}
		<div class="px-2 py-1.5 text-[11px] text-error bg-error/10" role="status" aria-live="polite">{installError}</div>
	{/if}

	{#if packageStatusMessage}
		<div class="px-2 py-1.5 text-[11px] text-text-secondary border-b border-border" role="status" aria-live="polite">
			{packageStatusMessage}
		</div>
	{/if}

	<div class="flex-1 overflow-y-auto">
		{#each packages as pkg (pkg.name)}
			<div class="group flex items-center px-3 py-1.5 gap-1 border-b border-border {pkg.status === 'error' ? 'bg-error/10' : ''}">
				<span class="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{pkg.name}</span>
				{#if pkg.status === "installing"}
					<span class="size-3 border-2 border-border border-t-accent rounded-full animate-spin"></span>
					<span class="sr-only">Installing</span>
				{:else if pkg.status === "error"}
					<span class="text-error text-[11px]" title={pkg.errorMessage}>error</span>
				{:else}
					<span class="text-text-secondary text-[11px]">@{pkg.version}</span>
				{/if}
				<button
					class="bg-transparent px-1.5 py-0.5 text-base leading-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity hover:bg-error"
					onclick={() => onremove(pkg.name)}
					disabled={pkg.status === "installing"}
					aria-label={`Remove ${pkg.name}`}
					title="Remove"
				>
					×
				</button>
			</div>
		{/each}
	</div>
</div>
