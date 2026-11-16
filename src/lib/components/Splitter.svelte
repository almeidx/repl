<script lang="ts">
	/**
	 * Resizes the panel after it (below a horizontal splitter, right of a vertical one).
	 * That panel extends to the window edge, so its size is the pointer's distance from that edge.
	 */
	interface Props {
		label: string;
		orientation: 'horizontal' | 'vertical';
		/** Panel size in pixels. */
		value: number;
		min: number;
		max: number;
		class?: string;
	}

	let { label, orientation, value = $bindable(), min, max, class: className = '' }: Props = $props();

	const STEP = 16;
	const horizontal = $derived(orientation === 'horizontal');

	const resize = (size: number) => (value = Math.round(Math.max(min, Math.min(size, max))));

	/** Pointer capture keeps events flowing while the pointer is over the editor. */
	function onpointerdown(event: PointerEvent) {
		if (event.button !== 0) return;
		event.preventDefault();
		const handle = event.currentTarget as HTMLElement;
		const move = (moved: PointerEvent) => resize(horizontal ? innerHeight - moved.clientY : innerWidth - moved.clientX);
		handle.setPointerCapture(event.pointerId);
		handle.addEventListener('pointermove', move);
		handle.addEventListener('lostpointercapture', () => handle.removeEventListener('pointermove', move), { once: true });
	}

	function onkeydown(event: KeyboardEvent) {
		const [grow, shrink] = horizontal ? ['ArrowUp', 'ArrowDown'] : ['ArrowLeft', 'ArrowRight'];
		if (event.key === grow) resize(value + STEP);
		else if (event.key === shrink) resize(value - STEP);
	}
</script>

<!-- A focusable separator is the ARIA window-splitter pattern; Svelte's a11y rules treat it as static. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div
	role="separator"
	tabindex="0"
	aria-label={label}
	aria-orientation={orientation}
	aria-valuenow={value}
	aria-valuemin={min}
	aria-valuemax={max}
	class={[
		'shrink-0 border-border transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none',
		horizontal ? 'h-1 cursor-row-resize border-t' : 'w-1 cursor-col-resize border-l',
		className,
	]}
	{onpointerdown}
	{onkeydown}
></div>
