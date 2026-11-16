<script lang="ts" generics="T">
	import * as combobox from '@zag-js/combobox';
	import { normalizeProps, useMachine } from '@zag-js/svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		id: string;
		label: string;
		items: readonly T[];
		toValue: (item: T) => string;
		/** Selected value; the input shows it whenever the list is closed. */
		value: string;
		onSelect: (value: string) => void;
		/** Fires as the user types; the parent filters `items` from it. */
		onQuery?: (query: string) => void;
		/** Enter on free text selects it, for values the list may not contain. */
		allowCustomValue?: boolean;
		placeholder?: string;
		disabled?: boolean;
		loading?: boolean;
		/** Shown when `items` is empty and the list is open. */
		emptyText?: string;
		/** Shown below the items, e.g. to note truncation. */
		footer?: string;
		item: Snippet<[T, { highlighted: boolean; selected: boolean }]>;
		/** Single-line toolbar variant with a visually hidden label. */
		compact?: boolean;
		class?: string;
	}

	let {
		id,
		label,
		items,
		toValue,
		value,
		onSelect,
		onQuery,
		allowCustomValue = false,
		placeholder,
		disabled = false,
		loading = false,
		emptyText,
		footer,
		item,
		compact = false,
		class: className = '',
	}: Props = $props();

	// svelte-ignore state_referenced_locally
	let query = $state(value);

	const collection = $derived(
		combobox.collection<T>({ items: [...items], itemToValue: toValue, itemToString: toValue }),
	);

	const service = useMachine(combobox.machine, () => ({
		id,
		collection,
		value: value ? [value] : [],
		inputValue: query,
		disabled,
		allowCustomValue,
		openOnClick: true,
		// The input text is owned here (`query`). With `replace`, zag rewrites it from the
		// collection, which is blank whenever the selected value is not among the shown items.
		selectionBehavior: 'preserve' as const,
		positioning: { sameWidth: !compact, gutter: 4, placement: 'bottom-start' as const },
		onInputValueChange: ({ inputValue, reason }) => {
			query = inputValue;
			if (reason === 'input-change') onQuery?.(inputValue);
		},
		onOpenChange: ({ open }) => {
			if (!open && !allowCustomValue) query = value;
		},
		onValueChange: ({ value: [selected] }) => {
			if (!selected) return;
			query = selected;
			selectText();
			onSelect(selected);
		},
	}));

	const api = $derived(combobox.connect(service, normalizeProps));

	// Show the new selection when the parent changes `value` (e.g. swapping versions).
	// svelte-ignore state_referenced_locally
	let shownValue = value;
	$effect(() => {
		if (value === shownValue) return;
		shownValue = value;
		query = value;
	});

	let inputEl: HTMLInputElement;
	let closedOnPress = false;

	/**
	 * Selects the input text so typing replaces the current value instead of appending
	 * to it. Deferred so the mouseup after a click does not collapse the selection.
	 */
	function selectText() {
		setTimeout(() => {
			if (document.activeElement === inputEl) inputEl.select();
		});
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!allowCustomValue || event.key !== 'Enter' || api.highlightedValue != null) return;
		const custom = query.trim();
		if (!custom) return;
		event.preventDefault();
		api.setOpen(false);
		selectText();
		onSelect(custom);
	}
</script>

<div class="flex min-w-0 flex-col gap-1.5 {className}" {...api.getRootProps()}>
	<label class={compact ? 'sr-only' : 'text-xs font-medium text-muted'} {...api.getLabelProps()}>{label}</label>
	<div
		class="flex items-center rounded-lg border border-border bg-bg pr-1 transition-colors focus-within:border-accent data-disabled:opacity-60 {compact
			? 'h-8 pl-2.5'
			: 'h-10 pl-3'}"
		{...api.getControlProps()}
	>
		<input
			bind:this={inputEl}
			class="min-w-0 flex-1 bg-transparent font-mono text-sm outline-none placeholder:font-sans placeholder:text-faint"
			autocomplete="off"
			spellcheck="false"
			{...api.getInputProps()}
			{placeholder}
			onkeydown={(event) => {
				handleKeydown(event);
				api.getInputProps().onkeydown?.(event);
			}}
			onfocus={(event) => {
				api.getInputProps().onfocus?.(event);
				selectText();
			}}
			onpointerdown={(event) => {
				closedOnPress = !api.open;
				api.getInputProps().onpointerdown?.(event);
			}}
			onclick={(event) => {
				api.getInputProps().onclick?.(event);
				// A click that opens the list is a fresh pick; one inside an open list moves the caret.
				if (closedOnPress) selectText();
			}}
		/>
		{#if loading}
			<span class="spinner mx-2 shrink-0 text-xs" aria-hidden="true"></span>
		{/if}
		<button
			type="button"
			class="grid size-8 shrink-0 place-items-center rounded-md text-faint hover:text-fg"
			{...api.getTriggerProps()}
		>
			<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class:rotate-180={api.open}>
				<path d="M4.4 6.4l3.4 3.4a.25.25 0 00.4 0l3.4-3.4a.25.25 0 00-.2-.4H4.6a.25.25 0 00-.2.4z" />
			</svg>
		</button>
	</div>

	<!-- The list opens on focus, possibly before any item exists; never show an empty panel. -->
	<div class="z-50" class:hidden={items.length === 0 && !emptyText && !footer} {...api.getPositionerProps()}>
		<ul
			class="max-h-80 min-w-72 overflow-y-auto rounded-lg border border-border bg-bg p-1 shadow-xl shadow-black/20 outline-none"
			{...api.getContentProps()}
		>
			{#each items as entry (toValue(entry))}
				{@const state = api.getItemState({ item: entry })}
				<li
					class="cursor-default rounded-md px-2.5 py-1.5 data-highlighted:bg-raised"
					{...api.getItemProps({ item: entry })}
				>
					{@render item(entry, { highlighted: state.highlighted, selected: state.selected })}
				</li>
			{:else}
				{#if emptyText}
					<li class="px-2.5 py-2 text-xs text-muted">{emptyText}</li>
				{/if}
			{/each}
			{#if footer}
				<li class="px-2.5 py-1.5 text-center text-xs text-faint" role="presentation">{footer}</li>
			{/if}
		</ul>
	</div>
</div>
